import type { Context } from 'grammy';
import { telegramView } from '../views/telegram.view';
import { telegramLogger } from '../../logs';

export class CommandController {
  /**
   * Menangani perintah /start
   */
  async handleStart(ctx: Context): Promise<void> {
    const firstName = ctx.from?.first_name;
    const botName = ctx.me?.first_name || 'Asisten Bisnis';
    telegramLogger.info(`Perintah /start diterima dari user ${ctx.from?.id} (@${ctx.from?.username || firstName})`, {
      action: 'command_start',
      senderId: ctx.from?.id.toString(),
      chatId: ctx.chat?.id.toString(),
    });

    const message = telegramView.renderWelcome(firstName, botName);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Menangani perintah /help
   */
  async handleHelp(ctx: Context): Promise<void> {
    telegramLogger.info(`Perintah /help diterima dari user ${ctx.from?.id}`, {
      action: 'command_help',
      senderId: ctx.from?.id.toString(),
    });

    const message = telegramView.renderHelp();
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Menangani perintah /status
   */
  async handleStatus(ctx: Context): Promise<void> {
    const botName = ctx.me?.first_name || 'Meseid Bot';
    const botId = ctx.me?.id.toString() || 'Unknown';
    const mode = process.env.TELEGRAM_MODE || 'polling';

    telegramLogger.info(`Perintah /status diterima dari user ${ctx.from?.id}`, {
      action: 'command_status',
      botId,
      senderId: ctx.from?.id.toString(),
    });

    const message = telegramView.renderStatus(botName, botId, mode, true);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Menangani perintah /otp (Inverted OTP Telegram)
   */
  async handleOtp(ctx: Context): Promise<void> {
    if (!ctx.from || !ctx.me) return;

    const botId = ctx.me.id.toString();
    const chatId = ctx.from.id.toString();

    telegramLogger.info(`Permintaan /otp dari user ${chatId} ke bot ${botId}`, {
      action: 'command_otp',
      botId,
      chatId,
    });

    const apiUrl = (process.env.API_INTERNAL_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const secret = process.env.INTERNAL_API_SECRET || '';

    try {
      const res = await fetch(`${apiUrl}/api/internal/telegram/generate-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({
          bot_id: botId,
          chat_id: chatId,
        }),
      });

      if (!res.ok) {
        await ctx.reply('⚠️ Maaf, bot ini belum terhubung dengan akun toko di Meseid atau sistem sedang sibuk.');
        return;
      }

      const json = (await res.json()) as { status: string; code?: string };
      if (json.status === 'ok' && json.code) {
        const replyText =
          `🔐 *Kode Verifikasi Telegram Meseid*\n\n` +
          `Kode OTP Anda:\n` +
          `*${json.code}*\n\n` +
          `Masukkan 6 digit kode ini pada halaman Overview Meseid untuk menautkan akun Anda sebagai Pemilik Toko.\n` +
          `_(Kode ini berlaku selama 5 menit)_`;

        await ctx.reply(replyText, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('⚠️ Gagal men-generate kode OTP. Silakan coba kembali.');
      }
    } catch (err: any) {
      telegramLogger.error('Kesalahan saat memproses perintah /otp', err);
      await ctx.reply('⚠️ Terjadi kendala saat menghubungi server Meseid. Silakan coba beberapa saat lagi.');
    }
  }
}

export const commandController = new CommandController();
