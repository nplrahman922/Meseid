import { createModuleLogger } from '../logs';

const pacerLogger = createModuleLogger('chat-pacer');

export interface BufferedMessageItem {
  messageId: string;
  text: string;
  timestamp: number;
}

export interface ChatPacerOptions {
  debounceMs?: number;
  maxDebounceMs?: number;
  minDelayWaMs?: number;
  maxDelayWaMs?: number;
  minDelayTgMs?: number;
  maxDelayTgMs?: number;
}

export interface BufferSession {
  channel: 'whatsapp' | 'telegram';
  botId: string;
  senderId: string;
  chatId: string;
  items: BufferedMessageItem[];
  firstMessageAt: number;
  timer: NodeJS.Timeout | null;
  presenceInterval: NodeJS.Timeout | null;
  latestPayload: any;
  sendPresence: () => Promise<void>;
  onFlush: (mergedText: string, latestPayload: any) => Promise<void>;
}

export class ChatPacer {
  private sessions: Map<string, BufferSession> = new Map();
  public debounceMs: number;
  public maxDebounceMs: number;
  public minDelayWaMs: number;
  public maxDelayWaMs: number;
  public minDelayTgMs: number;
  public maxDelayTgMs: number;

  constructor(options: ChatPacerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 15000; // Akumulasi 15 detik untuk burst messages
    this.maxDebounceMs = options.maxDebounceMs ?? 20000; // Batas atas maksimal 20 detik
    this.minDelayWaMs = options.minDelayWaMs ?? 1000;
    this.maxDelayWaMs = options.maxDelayWaMs ?? 3000;
    this.minDelayTgMs = options.minDelayTgMs ?? 1000;
    this.maxDelayTgMs = options.maxDelayTgMs ?? 3000;
  }

  /**
   * Membuat key sesi unik berdasarkan channel, botId, dan senderId.
   */
  public getSessionKey(channel: string, botId: string, senderId: string): string {
    return `${channel}:${botId}:${senderId}`;
  }

  /**
   * Menghitung delay dinamis manusiawi (human-like pacing).
   * WhatsApp: 7 - 15 detik (Anti-Banning Baileys)
   * Telegram: 4 - 8 detik (Adaptif)
   */
  public calculateDynamicDelay(
    channel: 'whatsapp' | 'telegram',
    replyTextLength: number = 0
  ): number {
    const isWa = channel === 'whatsapp';
    const minDelay = isWa ? this.minDelayWaMs : this.minDelayTgMs;
    const maxDelay = isWa ? this.maxDelayWaMs : this.maxDelayTgMs;

    // Tambahkan bobot proporsional panjang karakter (20ms per karakter) + jitter acak
    const charDelay = Math.min(replyTextLength * 20, 3000);
    const randomJitter = Math.floor(Math.random() * (maxDelay - minDelay));
    const calculated = minDelay + randomJitter + charDelay;

    return Math.min(Math.max(calculated, minDelay), maxDelay);
  }

  /**
   * Menerima pesan teks baru dan memasukkannya ke dalam buffer debounce.
   * Jika pesan susulan masuk dalam jendela debounceMs, teks digabung dan timer direset.
   */
  public enqueueMessage(params: {
    channel: 'whatsapp' | 'telegram';
    botId: string;
    senderId: string;
    chatId: string;
    messageId: string;
    text: string;
    payload: any;
    sendPresence: () => Promise<void>;
    onFlush: (mergedText: string, latestPayload: any) => Promise<void>;
  }): void {
    const sessionKey = this.getSessionKey(params.channel, params.botId, params.senderId);
    let session = this.sessions.get(sessionKey);
    const now = Date.now();

    if (!session) {
      session = {
        channel: params.channel,
        botId: params.botId,
        senderId: params.senderId,
        chatId: params.chatId,
        items: [],
        firstMessageAt: now,
        timer: null,
        presenceInterval: null,
        latestPayload: params.payload,
        sendPresence: params.sendPresence,
        onFlush: params.onFlush,
      };
      this.sessions.set(sessionKey, session);
    } else {
      // Perbarui referensi callback & payload terbaru
      session.sendPresence = params.sendPresence;
      session.onFlush = params.onFlush;
      session.latestPayload = params.payload;
    }

    // Tambahkan pesan ke buffer jika belum ada
    const existingIndex = session.items.findIndex((item) => item.messageId === params.messageId);
    if (existingIndex >= 0) {
      session.items[existingIndex].text = params.text;
    } else {
      session.items.push({
        messageId: params.messageId,
        text: params.text,
        timestamp: now,
      });
    }

    // Kirim presence update langsung saat pesan pertama masuk
    params.sendPresence().catch(() => {});

    // Reset atau mulai timer debounce dengan batas atas maxDebounceMs (15 - 20 detik)
    if (session.timer) {
      clearTimeout(session.timer);
    }

    // Jalankan presence loop setiap 3 detik jika belum aktif
    if (!session.presenceInterval) {
      session.presenceInterval = setInterval(() => {
        const s = this.sessions.get(sessionKey);
        if (s) {
          s.sendPresence().catch(() => {});
        }
      }, 3000);
    }

    const elapsedTotal = now - session.firstMessageAt;
    const remainingToCap = Math.max(this.maxDebounceMs - elapsedTotal, 1000);
    const delay = Math.min(this.debounceMs, remainingToCap);

    session.timer = setTimeout(() => {
      this.flushSession(sessionKey);
    }, delay);

    pacerLogger.info(`Buffer diperbarui untuk [${sessionKey}]: ${session.items.length} pesan terakumulasi (timer ${delay}ms)`);
  }

  /**
   * Memperbarui teks pesan yang diedit oleh user sebelum buffer dikirim.
   */
  public updateEditedMessage(
    channel: 'whatsapp' | 'telegram',
    botId: string,
    senderId: string,
    messageId: string,
    newText: string
  ): boolean {
    const sessionKey = this.getSessionKey(channel, botId, senderId);
    const session = this.sessions.get(sessionKey);
    if (!session) return false;

    const targetItem = session.items.find((item) => item.messageId === messageId);
    if (targetItem) {
      targetItem.text = newText;
      pacerLogger.info(`Pesan ${messageId} di buffer [${sessionKey}] berhasil diupdate ke: "${newText}"`);
      return true;
    }
    return false;
  }

  /**
   * Melepas buffer dan memicu eksekusi gabungan pesan.
   */
  public async flushSession(sessionKey: string): Promise<void> {
    const session = this.sessions.get(sessionKey);
    if (!session) return;

    // Bersihkan timer dan presence interval
    if (session.timer) clearTimeout(session.timer);
    if (session.presenceInterval) clearInterval(session.presenceInterval);
    this.sessions.delete(sessionKey);

    const mergedText = session.items
      .map((item) => item.text.trim())
      .filter(Boolean)
      .join('\n');

    if (!mergedText) return;

    pacerLogger.info(`Flushing buffer [${sessionKey}] dengan total ${session.items.length} pesan digabung: "${mergedText.slice(0, 80)}..."`);

    try {
      await session.onFlush(mergedText, session.latestPayload);
    } catch (err: any) {
      pacerLogger.error(`Error saat eksekusi onFlush [${sessionKey}]: ${err.message}`, err);
    }
  }

  /**
   * Menghapus seluruh sesi aktif (misal saat shutdown).
   */
  public clearAll(): void {
    for (const [key, session] of this.sessions.entries()) {
      if (session.timer) clearTimeout(session.timer);
      if (session.presenceInterval) clearInterval(session.presenceInterval);
    }
    this.sessions.clear();
  }
}

export const chatPacer = new ChatPacer();
