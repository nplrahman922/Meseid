import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useRedisAuthState } from '../../src/whatsapp/auth/redis.auth';

describe('Redis Auth State Adapter Suite for Baileys', () => {
  // In-memory mock Redis untuk pengujian unit terisolasi
  class MockRedis {
    public storage: Map<string, Map<string, string>> = new Map();

    private getHash(key: string): Map<string, string> {
      if (!this.storage.has(key)) {
        this.storage.set(key, new Map());
      }
      return this.storage.get(key)!;
    }

    async hget(key: string, field: string): Promise<string | null> {
      const hash = this.storage.get(key);
      return hash?.get(field) ?? null;
    }

    async hset(key: string, fieldOrRecord: string | Record<string, string>, val?: string): Promise<number> {
      const hash = this.getHash(key);
      if (typeof fieldOrRecord === 'string') {
        hash.set(fieldOrRecord, val!);
        return 1;
      }
      for (const [f, v] of Object.entries(fieldOrRecord)) {
        hash.set(f, v);
      }
      return Object.keys(fieldOrRecord).length;
    }

    async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
      const hash = this.storage.get(key);
      return fields.map((f) => hash?.get(f) ?? null);
    }

    async hdel(key: string, ...fields: string[]): Promise<number> {
      const hash = this.storage.get(key);
      if (!hash) return 0;
      let count = 0;
      for (const f of fields) {
        if (hash.delete(f)) count++;
      }
      return count;
    }

    async del(key: string): Promise<number> {
      return this.storage.delete(key) ? 1 : 0;
    }

    pipeline() {
      const operations: Array<() => Promise<any>> = [];
      const self = this;
      return {
        hset(key: string, record: Record<string, string>) {
          operations.push(() => self.hset(key, record));
          return this;
        },
        hdel(key: string, ...fields: string[]) {
          operations.push(() => self.hdel(key, ...fields));
          return this;
        },
        async exec() {
          for (const op of operations) {
            await op();
          }
          return [];
        },
      };
    }
  }

  it('menginisialisasi creds baru jika belum ada di Redis', async () => {
    const mockRedis = new MockRedis();
    const { state } = await useRedisAuthState(mockRedis as any, 'tenant_1');

    assert.ok(state.creds);
    assert.ok(state.creds.noiseKey);
    assert.ok(state.creds.pairingEphemeralKeyPair);
  });

  it('menyimpan dan membaca kembali creds via saveCreds()', async () => {
    const mockRedis = new MockRedis();
    const auth1 = await useRedisAuthState(mockRedis as any, 'tenant_save');

    // Modifikasi field creds
    (auth1.state.creds as any).me = { id: '628123456789:1@s.whatsapp.net', name: 'Tester' };
    await auth1.saveCreds();

    // Verifikasi bahwa data tersimpan di Redis
    const raw = await mockRedis.hget('wa:session:tenant_save', '__creds__');
    assert.ok(raw);
    assert.ok(raw.includes('628123456789'));

    // Muat ulang sesi yang sama
    const auth2 = await useRedisAuthState(mockRedis as any, 'tenant_save');
    assert.equal((auth2.state.creds as any).me?.name, 'Tester');
  });

  it('menyimpan dan mengambil Signal keys (pre-key, sender-key)', async () => {
    const mockRedis = new MockRedis();
    const { state } = await useRedisAuthState(mockRedis as any, 'tenant_keys');

    // Simpan keys
    await state.keys.set({
      'pre-key': {
        '1': { keyId: 1, keyPair: { public: Buffer.from('test_pub'), private: Buffer.from('test_priv') } },
        '2': { keyId: 2, keyPair: { public: Buffer.from('pub_2'), private: Buffer.from('priv_2') } },
      },
      'session': {
        'user_a': { registrationId: 9999 },
      },
    });

    // Ambil keys secara batch
    const preKeys = await state.keys.get('pre-key', ['1', '2', '3']);
    assert.ok(preKeys['1']);
    assert.equal(preKeys['1'].keyId, 1);
    assert.ok(Buffer.isBuffer(preKeys['1'].keyPair.public));
    assert.ok(preKeys['2']);
    assert.equal(preKeys['3'], null); // ID tidak ada mengembalikan null

    const sessions = await state.keys.get('session', ['user_a']);
    assert.equal(sessions['user_a'].registrationId, 9999);
  });

  it('menghapus keys saat value bernilai null atau undefined', async () => {
    const mockRedis = new MockRedis();
    const { state } = await useRedisAuthState(mockRedis as any, 'tenant_delete');

    // Set key
    await state.keys.set({
      'sender-key': {
        'group_1': { test: 'value_1' },
      },
    });

    let keys = await state.keys.get('sender-key', ['group_1']);
    assert.ok(keys['group_1']);

    // Hapus key dengan memberikan null
    await state.keys.set({
      'sender-key': {
        'group_1': null,
      },
    });

    keys = await state.keys.get('sender-key', ['group_1']);
    assert.equal(keys['group_1'], null);
  });

  it('clearSession menghapus seluruh hash sesi di Redis', async () => {
    const mockRedis = new MockRedis();
    const auth = await useRedisAuthState(mockRedis as any, 'tenant_wipe');

    await auth.saveCreds();
    await auth.state.keys.set({
      'pre-key': { '10': { val: 10 } },
    });

    assert.ok(mockRedis.storage.has('wa:session:tenant_wipe'));

    await auth.clearSession();
    assert.equal(mockRedis.storage.has('wa:session:tenant_wipe'), false);
  });
});
