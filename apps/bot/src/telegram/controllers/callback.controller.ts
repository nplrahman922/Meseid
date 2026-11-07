import type { Context } from 'grammy';
import { apiClient } from '../models/api.client';
import { telegramView } from '../views/telegram.view';
import { TelegramTextFormatter } from '../formatters/telegram-text.formatter';
import type { InboundMessagePayload } from '../models/types';
import { logCallbackReceived, telegramLogger } from '../../logs';

export class CallbackController {
  /**
   * Menangani interaksi tombol inline (Callback Query).
   */
  async handleCallbackQuery(ctx: Context): Promise<void> {
    if (!ctx.callbackQuery || !ctx.from || !ctx.me) {
      return;
    }

    const callbackData = ctx.callbackQuery.data || '';
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    const botId = ctx.me.id.toString();
    const senderId = ctx.from.id.toString();

    logCallbackReceived(botId, callbackData, senderId);

    // Kirim acknowledgment Telegram agar loading spinner di tombol berhenti
    await ctx.answerCallbackQuery().catch(() => {});

    const payload: InboundMessagePayload = {
      channel: 'telegram',
      bot_id: botId,
      external_message_id: ctx.callbackQuery.id,
      sender_id: senderId,
      sender_name: senderName,
      sender_username: ctx.from.username,
      chat_id: ctx.chat?.id.toString() || senderId,
      chat_type: (ctx.chat?.type as any) || 'private',
      message_type: 'callback',
      callback_data: callbackData,
      timestamp: Math.floor(Date.now() / 1000),
    };

    try {
      const response = await apiClient.sendInboundMessage(payload);

      if (response.reply_text) {
        const keyboard = telegramView.renderInlineKeyboard(response.action_buttons);
        await TelegramTextFormatter.replyWithHtmlOrFallback(ctx, response.reply_text, {
          reply_markup: keyboard,
        });
      }
    } catch (err: any) {
      telegramLogger.error(`Gagal memproses aksi tombol Telegram: ${err.message}`, err, {
        botId,
        senderId,
        callbackData,
      });

      await ctx.reply('Mohon maaf, terjadi kendala saat memproses pilihan Anda. Silakan coba kembali.').catch(() => {});
    }
  }
}

export const callbackController = new CallbackController();
