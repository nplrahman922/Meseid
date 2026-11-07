import type { Context } from 'grammy';
import { apiClient } from '../models/api.client';
import { telegramView } from '../views/telegram.view';
import { telegramMediaDownloader } from '../media/telegram-media.downloader';
import { TelegramTextFormatter } from '../formatters/telegram-text.formatter';
import type { InboundMessagePayload } from '../models/types';
import { logPhotoReceived, telegramLogger } from '../../logs';

export class PhotoController {
  /**
   * Menangani kiriman foto (misal: nota fisik / struk belanja) dari pengguna Telegram.
   */
  async handlePhotoMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !ctx.message.photo || !ctx.from || !ctx.chat || !ctx.me) {
      return;
    }

    const photos = ctx.message.photo;
    const highestResPhoto = photos[photos.length - 1];
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    const botId = ctx.me.id.toString();
    const externalMsgId = ctx.message.message_id.toString();
    const senderId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();

    logPhotoReceived(botId, externalMsgId, senderId, highestResPhoto.file_id, chatId);

    // Tampilkan indikator aksi bot sedang mengunggah/memproses foto
    await ctx.replyWithChatAction('upload_photo').catch(() => {});

    // Unduh dan optimalkan foto HP menjadi JPEG terkompresi & Base64
    const optimized = await telegramMediaDownloader.downloadAndOptimizePhoto(
      ctx,
      highestResPhoto.file_id
    );

    const payload: InboundMessagePayload = {
      channel: 'telegram',
      bot_id: botId,
      external_message_id: externalMsgId,
      sender_id: senderId,
      sender_name: senderName,
      sender_username: ctx.from.username,
      chat_id: chatId,
      chat_type: ctx.chat.type as any,
      message_type: 'photo',
      text: ctx.message.caption || '',
      attachments: [
        {
          file_id: highestResPhoto.file_id,
          file_type: 'photo',
          mime_type: optimized?.mimeType || 'image/jpeg',
          file_size: optimized?.buffer.length || highestResPhoto.file_size,
          data_base64: optimized?.base64,
        },
      ],
      timestamp: ctx.message.date,
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
      telegramLogger.error(`Gagal memproses foto nota belanja Telegram: ${err.message}`, err, {
        botId,
        senderId,
        fileId: highestResPhoto.file_id,
      });

      await ctx.reply(
        'Mohon maaf, terjadi kendala saat memproses gambar/nota Anda. Silakan coba kirim ulang ya.'
      ).catch(() => {});
    }
  }
}

export const photoController = new PhotoController();
