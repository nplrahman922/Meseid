import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { getBaileys, type WASocket, type AuthenticationState } from './baileys.loader';
import { whatsAppRouter } from './router';
import { getRedisClient } from '../redis/client';
import { useRedisAuthState } from './auth/redis.auth';
import type {
  WhatsAppSessionConfig,
  WhatsAppSessionStatus,
  OutboundMessagePayload,
  OutboundApiResponse,
} from './models/types';
import { whatsappLogger } from '../logs';
import { sessionRegistry } from './session/session.registry';
import type { WhatsAppSessionEntry } from './session/session.types';
import { OutboundSender } from './dispatch/outbound.sender';
import { ConnectionEventHandler } from './events/connection.handler';

export type { WhatsAppSessionEntry };

export class WhatsAppBotManager {
  private baseSessionPath: string;
  private isShuttingDown: boolean = false;

  constructor() {
    this.baseSessionPath = process.env.WA_SESSION_PATH || './data/wa-session';
  }

  /**
   * Mendaftarkan dan memulai satu instance sesi WhatsApp Baileys untuk tenant tertentu.
   */
  async registerSession(config: WhatsAppSessionConfig): Promise<WASocket> {
    const sessionId = config.sessionId.trim();
    if (!sessionId) {
      throw new Error('ID sesi WhatsApp tidak boleh kosong.');
    }

    if (sessionRegistry.has(sessionId)) {
      await this.stopSession(sessionId);
    }

    const baileys = await getBaileys();
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { DisconnectReason, useMultiFileAuthState } = baileys;

    const redis = await getRedisClient();
    let authState: AuthenticationState;
    let saveCredsHandler: () => Promise<void>;
    let clearSessionHandler: (() => Promise<void>) | undefined;
    let storageType: 'redis' | 'file' = 'file';

    if (redis) {
      storageType = 'redis';
      whatsappLogger.info(`Memuat kredensial WhatsApp sesi '${sessionId}' dari Redis (in-memory)...`, {
        action: 'load_session_credentials',
        sessionId,
        storage: 'redis',
      });
      const redisAuth = await useRedisAuthState(redis, sessionId);
      authState = redisAuth.state;
      saveCredsHandler = redisAuth.saveCreds;
      clearSessionHandler = redisAuth.clearSession;
    } else {
      storageType = 'file';
      const sessionDir =
        config.sessionPath || path.join(this.baseSessionPath, `session_${sessionId}`);

      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      whatsappLogger.info(`Memuat kredensial WhatsApp sesi '${sessionId}' dari disk: ${sessionDir}`, {
        action: 'load_session_credentials',
        sessionId,
        storage: 'file',
        sessionDir,
      });

      const fileAuth = await useMultiFileAuthState(sessionDir);
      authState = fileAuth.state;
      saveCredsHandler = fileAuth.saveCreds;
    }

    const sock = makeWASocket({
      auth: authState,
      printQRInTerminal: config.printQRInTerminal ?? false,
      logger: pino({ level: 'silent' }) as any,
      browser: ['Meseid Bot', 'Chrome', '1.0.0'],
      keepAliveIntervalMs: 30000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    const entry: WhatsAppSessionEntry = {
      sessionId,
      sock,
      config,
      status: 'connecting',
      storage: storageType,
      reconnectAttempts: 0,
      clearSession: clearSessionHandler,
    };

    sessionRegistry.set(sessionId, entry);

    // 1. Tangani pembaruan kredensial sesi
    sock.ev.on('creds.update', saveCredsHandler);

    // 2. Tangani siklus hidup koneksi & QR code
    ConnectionEventHandler.attach(entry, DisconnectReason, {
      onReconnect: (sId) => this.reconnect(sId),
      isShuttingDown: () => this.isShuttingDown,
    });

    // 3. Pasang Router Pesan Masuk
    sock.ev.on('messages.upsert', async (upsert) => {
      await whatsAppRouter.handleUpsert(
        sock,
        upsert,
        sessionId,
        entry.phoneNumber || '',
        entry.status === 'open'
      );
    });

    return sock;
  }

  /**
   * Menghubungkan ulang sesi yang terputus sementara.
   */
  private async reconnect(sessionId: string): Promise<void> {
    const entry = sessionRegistry.get(sessionId);
    if (!entry) return;

    whatsappLogger.info(`Mencoba reconnect WhatsApp sesi '${sessionId}' (percobaan ke-${entry.reconnectAttempts})...`, {
      action: 'reconnect_session',
      sessionId,
      attempts: entry.reconnectAttempts,
    });

    try {
      entry.sock.end(undefined);
    } catch {
      // Abaikan jika sudah tertutup
    }

    await this.registerSession(entry.config);
  }

  getSession(sessionId?: string): WhatsAppSessionEntry | undefined {
    return sessionRegistry.get(sessionId);
  }

  getAllSessions(): Map<string, WhatsAppSessionEntry> {
    return sessionRegistry.getAll();
  }

  getSessionStatuses(): WhatsAppSessionStatus[] {
    return sessionRegistry.getStatuses();
  }

  getQr(sessionId?: string): string | undefined {
    return sessionRegistry.getQr(sessionId);
  }

  async sendMessage(payload: OutboundMessagePayload): Promise<OutboundApiResponse> {
    return OutboundSender.sendMessage(payload);
  }

  async initFromEnv(): Promise<void> {
    const autoStart = process.env.START_DEFAULT_WA_SESSION !== 'false';
    const defaultSessionId = process.env.WA_DEFAULT_SESSION_ID || 'default';

    if (!autoStart) {
      whatsappLogger.info('Autostart sesi WhatsApp default dinonaktifkan (START_DEFAULT_WA_SESSION=false).');
      return;
    }

    try {
      await this.registerSession({
        sessionId: defaultSessionId,
        sessionPath: path.join(this.baseSessionPath, `session_${defaultSessionId}`),
        printQRInTerminal: process.env.WA_PRINT_QR !== 'false',
      });
    } catch (err: any) {
      whatsappLogger.error(`Gagal menginisialisasi default WhatsApp sesi dari .env: ${err.message}`, err);
    }
  }

  async stopSession(sessionId: string, purge: boolean = false): Promise<void> {
    const entry = sessionRegistry.get(sessionId);
    if (entry) {
      if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
      try {
        entry.sock.end(undefined);
      } catch {
        // Abaikan jika sudah tertutup
      }
      if (purge && entry.clearSession) {
        await entry.clearSession().catch((err) => {
          whatsappLogger.warn(`Gagal membersihkan sesi storage: ${err.message}`);
        });
      }
      sessionRegistry.delete(sessionId);
      whatsappLogger.info(`Sesi WhatsApp '${sessionId}' telah dihentikan.`, {
        action: 'stop_session',
        sessionId,
        purged: purge,
      });
    }
  }

  async resetSession(sessionId: string): Promise<WASocket> {
    const cleanSessionId = sessionId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    await this.stopSession(sessionId, true);

    try {
      const redis = await getRedisClient();
      if (redis) {
        await redis.del(`wa:session:${cleanSessionId}`);
      }
    } catch (err: any) {
      whatsappLogger.warn(`Gagal menghapus hash sesi Redis saat reset: ${err.message}`);
    }

    const sessionDir = path.join(this.baseSessionPath, `session_${cleanSessionId}`);
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (err: any) {
        whatsappLogger.warn(`Gagal menghapus folder sesi disk saat reset: ${err.message}`);
      }
    }

    return this.registerSession({
      sessionId,
      sessionPath: sessionDir,
      printQRInTerminal: true,
    });
  }

  async stopAll(): Promise<void> {
    this.isShuttingDown = true;
    whatsappLogger.info('Menghentikan seluruh sesi WhatsApp...', { action: 'stop_all' });

    for (const [id, entry] of sessionRegistry.getAll().entries()) {
      if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
      try {
        entry.sock.end(undefined);
        whatsappLogger.info(`Sesi WhatsApp '${id}' berhenti.`, { action: 'session_stopped', sessionId: id });
      } catch (err: any) {
        whatsappLogger.warn(`Peringatan saat stop sesi WhatsApp '${id}': ${err.message}`, { sessionId: id });
      }
    }

    sessionRegistry.clear();
  }
}

export const whatsAppBotManager = new WhatsAppBotManager();
