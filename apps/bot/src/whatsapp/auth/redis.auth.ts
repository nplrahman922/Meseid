import type { Redis } from 'ioredis';
import { getBaileys, type AuthenticationState } from '../baileys.loader';

export interface RedisAuthStateResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearSession: () => Promise<void>;
}

/**
 * Custom Auth State Adapter untuk Baileys menggunakan Redis sebagai penyimpanan in-memory.
 *
 * Struktur Redis:
 * - Menggunakan Hash per sesi: `wa:session:{sessionId}`
 * - Field `__creds__`: Menyimpan data kredensial akun utama (creds.json)
 * - Field `{category}:{id}`: Menyimpan kunci enkripsi Signal E2EE (pre-keys, sender-keys, session-keys)
 *
 * Keuntungan dibanding useMultiFileAuthState:
 * - Sangat cepat (< 1ms di RAM), tidak ada I/O disk thrashing pada ratusan file kecil
 * - Kompatibel dengan arsitektur multi-instance / horizontally scaled di container Docker
 * - Atomic pipeline untuk update banyak keys sekaligus tanpa mutex file lock
 */
export async function useRedisAuthState(
  redis: Redis,
  sessionId: string,
  keyPrefix = 'wa:session'
): Promise<RedisAuthStateResult> {
  const baileys = await getBaileys();
  const { BufferJSON, initAuthCreds, proto } = baileys;

  const cleanSessionId = sessionId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const hashKey = `${keyPrefix}:${cleanSessionId}`;

  // 1. Baca atau inisialisasi kredensial (creds)
  const rawCreds = await redis.hget(hashKey, '__creds__');
  let creds: any;

  if (rawCreds) {
    try {
      creds = JSON.parse(rawCreds, BufferJSON.reviver);
    } catch {
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  // 2. Handler untuk menyimpan kredensial saat Baileys memicu event 'creds.update'
  const saveCreds = async (): Promise<void> => {
    const serialized = JSON.stringify(creds, BufferJSON.replacer);
    await redis.hset(hashKey, '__creds__', serialized);
  };

  // 3. Handler untuk menghapus seluruh sesi (misal saat logout permanen)
  const clearSession = async (): Promise<void> => {
    await redis.del(hashKey);
  };

  // 4. Bangun AuthenticationState dengan KeyStore berbasis Redis Hash
  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        if (!ids || ids.length === 0) {
          return {};
        }

        const fields = ids.map((id) => `${type}:${id}`);
        const rawValues = await redis.hmget(hashKey, ...fields);

        const data: { [id: string]: any } = {};

        for (let i = 0; i < ids.length; i++) {
          const raw = rawValues[i];
          if (raw) {
            try {
              let value = JSON.parse(raw, BufferJSON.reviver);
              if (type === 'app-state-sync-key' && value && proto?.Message?.AppStateSyncKeyData) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[ids[i]] = value;
            } catch {
              data[ids[i]] = null;
            }
          } else {
            data[ids[i]] = null;
          }
        }

        return data;
      },

      set: async (dataset: { [category: string]: { [id: string]: any } }) => {
        const toSet: Record<string, string> = {};
        const toDel: string[] = [];

        for (const category in dataset) {
          const items = dataset[category];
          if (!items) continue;

          for (const id in items) {
            const val = items[id];
            const field = `${category}:${id}`;
            if (val) {
              toSet[field] = JSON.stringify(val, BufferJSON.replacer);
            } else {
              toDel.push(field);
            }
          }
        }

        const pipeline = redis.pipeline();

        if (Object.keys(toSet).length > 0) {
          pipeline.hset(hashKey, toSet);
        }

        if (toDel.length > 0) {
          pipeline.hdel(hashKey, ...toDel);
        }

        await pipeline.exec();
      },
    },
  };

  return {
    state,
    saveCreds,
    clearSession,
  };
}
