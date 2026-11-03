import Redis, { type RedisOptions } from 'ioredis';
import { createModuleLogger } from '../logs';

const redisLogger = createModuleLogger('redis');

let redisClient: Redis | null = null;
let isInitialized = false;

/**
 * Menginisialisasi dan mengembalikan singleton client Redis.
 * Jika REDIS_URL tidak diset atau server Redis tidak dapat dijangkau,
 * fungsi ini mengembalikan null dengan anggun sehingga sistem otomatis fallback
 * ke penyimpanan sesi lokal (useMultiFileAuthState).
 */
export async function getRedisClient(): Promise<Redis | null> {
  if (isInitialized) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    redisLogger.info('REDIS_URL tidak diset. Fitur Redis dinonaktifkan (fallback ke disk storage).');
    isInitialized = true;
    redisClient = null;
    return null;
  }

  try {
    const options: RedisOptions = {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    };

    const client = new Redis(redisUrl, options);

    client.on('error', (err) => {
      redisLogger.error(`Koneksi Redis error: ${err.message}`, err);
    });

    client.on('close', () => {
      redisLogger.warn('Koneksi Redis terputus/ditutup.');
    });

    // Uji koneksi dan handshake dengan Redis
    await client.connect();
    await client.ping();

    redisLogger.info(`Koneksi Redis aktif & siap melayani di ${redisUrl.replace(/:[^:@]+@/, ':***@')}`);
    redisClient = client;
    isInitialized = true;
    return redisClient;
  } catch (err: any) {
    redisLogger.warn(
      `Tidak dapat terhubung ke Redis server (${redisUrl}): ${err.message}. Otomatis fallback ke file storage lokal.`
    );
    redisClient = null;
    isInitialized = true;
    return null;
  }
}

/**
 * Menutup koneksi Redis secara anggun saat shutdown aplikasi.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisLogger.info('Koneksi Redis berhasil ditutup.');
    } catch (err: any) {
      redisLogger.warn(`Peringatan saat menutup Redis: ${err.message}`);
      redisClient.disconnect();
    } finally {
      redisClient = null;
      isInitialized = false;
    }
  }
}
