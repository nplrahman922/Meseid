import { Bot, webhookCallback } from 'grammy';
import { telegramRouter } from './router';
import type {
  BotInstanceConfig,
  OutboundMessagePayload,
  OutboundApiResponse,
} from './models/types';
import { telegramView } from './views/telegram.view';
import { telegramLogger, logBotRegistered, logBotError } from '../logs';

export class TelegramBotManager {
  private bots: Map<string, Bot> = new Map();
  private isShuttingDown: boolean = false;

  /**
   * Mendaftarkan dan memulai satu instance bot Telegram untuk tenant tertentu.
   */
  async registerBot(config: BotInstanceConfig): Promise<Bot> {
    const token = config.token.trim();
    if (!token) {
      throw new Error('Token bot Telegram tidak boleh kosong.');
    }

    const bot = new Bot(token);

    // 1. Pasang Router MVC
    bot.use(telegramRouter);

    // 2. Error handling tersentralisasi
    bot.catch((err) => {
      logBotError(config.botId, err.message, err.error);
    });

    // 3. Ambil informasi bot dari Telegram
    await bot.init();
    const botId = bot.botInfo.id.toString();
    const botUsername = bot.botInfo.username;

    // Simpan ke pool bot
    this.bots.set(botId, bot);

    const mode = config.mode || (process.env.TELEGRAM_MODE === 'webhook' ? 'webhook' : 'polling');

    logBotRegistered(botId, botUsername, mode);

    // 4. Jalankan koneksi sesuai mode (Polling vs Webhook)
    if (mode === 'polling') {
      // Jalankan polling secara asynchronous (tidak memblokir thread)
      bot.start({
        drop_pending_updates: false,
        onStart: (info) => {
          telegramLogger.info(`🚀 Bot @${info.username} aktif mendengarkan pesan via POLLING.`);
        },
      }).catch((err) => {
        if (!this.isShuttingDown) {
          logBotError(botId, `Polling terhenti: ${err.message}`, err);
        }
      });
    } else if (mode === 'webhook' && config.webhookUrl) {
      const webhookTarget = `${config.webhookUrl.replace(/\/+$/, '')}/${botId}`;
      const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

      await bot.api.setWebhook(webhookTarget, {
        secret_token: secretToken,
      });
      telegramLogger.info(`🌐 Webhook terdaftar: ${webhookTarget}`);
    }

    return bot;
  }

  /**
   * Mengambil instance bot berdasarkan bot ID (atau default pertama jika botId tidak disebutkan).
   */
  getBot(botId?: string): Bot | undefined {
    if (botId && this.bots.has(botId)) {
      return this.bots.get(botId);
    }
    // Jika hanya ada 1 bot terdaftar, kembalikan bot tersebut
    if (this.bots.size === 1) {
      return this.bots.values().next().value;
    }
    return undefined;
  }

  /**
   * Mengembalikan semua instance bot yang terdaftar.
   */
  getAllBots(): Map<string, Bot> {
    return this.bots;
  }

  /**
   * Mengirimkan pesan outbound dari API ke pengguna Telegram.
   */
  async sendMessage(payload: OutboundMessagePayload): Promise<OutboundApiResponse> {
    const bot = this.getBot(payload.bot_id);
    if (!bot) {
      const errMsg = payload.bot_id
        ? `Bot Telegram dengan ID ${payload.bot_id} tidak ditemukan di pool aktif.`
        : 'Tidak ada instance bot Telegram yang aktif untuk mengirim pesan.';
      telegramLogger.error(`[Outbound Error] ${errMsg}`, undefined, {
        action: 'send_message_failed',
        payload,
      });
      return { success: false, error: errMsg };
    }

    try {
      const keyboard = telegramView.renderInlineKeyboard(payload.options?.action_buttons);
      const sent = await bot.api.sendMessage(payload.recipient_id, payload.message, {
        parse_mode: payload.options?.parse_mode,
        reply_markup: keyboard,
      });

      telegramLogger.info(`Pesan outbound terkirim ke recipient ${payload.recipient_id}`, {
        action: 'send_message_success',
        botId: payload.bot_id,
        recipientId: payload.recipient_id,
        messageId: sent.message_id,
      });

      return {
        success: true,
        message_id: sent.message_id,
      };
    } catch (err: any) {
      telegramLogger.error(`Gagal kirim pesan ke ${payload.recipient_id}: ${err.message}`, err, {
        action: 'send_message_error',
        recipientId: payload.recipient_id,
      });
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Inisialisasi bot dari file .env (Master System Bot).
   */
  async initFromEnv(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      telegramLogger.info('TELEGRAM_BOT_TOKEN belum diset di .env. Menunggu registrasi bot tenant dinamis.');
      return;
    }

    try {
      await this.registerBot({
        botId: 'env_master',
        token,
        mode: process.env.TELEGRAM_MODE === 'webhook' ? 'webhook' : 'polling',
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      });
    } catch (err: any) {
      telegramLogger.error(`Gagal menginisialisasi bot dari .env: ${err.message}`, err);
    }
  }

  /**
   * Menghasilkan webhook handler middleware untuk framework Hono.
   */
  createWebhookHandler(botId: string) {
    const bot = this.getBot(botId);
    if (!bot) {
      return null;
    }
    return webhookCallback(bot, 'hono', {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    });
  }

  /**
   * Memvalidasi token bot dari BotFather via Telegram API getMe,
   * dan mendaftarkan instance bot ke pool aktif jika valid.
   */
  async verifyAndRegisterBot(token: string): Promise<{
    valid: boolean;
    botId?: string;
    username?: string;
    firstName?: string;
    error?: string;
  }> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { valid: false, error: 'Telegram bot token cannot be empty.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const data = (await res.json()) as any;

      if (!data.ok || !data.result) {
        return {
          valid: false,
          error: data.description || 'Invalid token. Please check your BotFather token.',
        };
      }

      const botId = String(data.result.id);
      const username = data.result.username || '';
      const firstName = data.result.first_name || '';

      // Daftarkan bot ke pool aktif jika belum terdaftar
      if (!this.bots.has(botId)) {
        await this.registerBot({
          botId,
          token: cleanToken,
          mode: 'polling',
        });
      }

      return {
        valid: true,
        botId,
        username,
        firstName,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Failed to reach Telegram API: ${err.message}`,
      };
    }
  }

  /**
   * Menghentikan bot tertentu.
   */
  async stopBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (bot) {
      await bot.stop();
      this.bots.delete(botId);
      telegramLogger.info(`Bot ID ${botId} telah dihentikan.`, { action: 'stop_bot', botId });
    }
  }

  /**
   * Menghentikan seluruh bot (misal saat server shutdown).
   */
  async stopAll(): Promise<void> {
    this.isShuttingDown = true;
    telegramLogger.info('Menghentikan seluruh instance bot...', { action: 'stop_all' });
    for (const [id, bot] of this.bots.entries()) {
      try {
        await bot.stop();
        telegramLogger.info(`Bot ${id} berhenti.`, { action: 'bot_stopped', botId: id });
      } catch (err: any) {
        telegramLogger.warn(`Peringatan saat stop bot ${id}: ${err.message}`, { botId: id });
      }
    }
    this.bots.clear();
  }
}

export const telegramBotManager = new TelegramBotManager();
