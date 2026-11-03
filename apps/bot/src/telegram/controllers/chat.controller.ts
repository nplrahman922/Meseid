import type { Context } from 'grammy';
import { apiClient } from '../models/api.client';
import { telegramView } from '../views/telegram.view';
import type { InboundMessagePayload } from '../models/types';
import { chatPacer } from '../../common/chat.pacer';
import {
  logMessageReceived,
  logPhotoReceived,
  logCallbackReceived,
} from '../../logs';

export class ChatController {
  /**
   * Menangani pesan teks biasa dari pengguna Telegram.
   */
  async handleTextMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !ctx.message.text || !ctx.from || !ctx.chat || !ctx.me) {
      return;
    }

    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    const botId = ctx.me.id.toString();
    const externalMsgId = ctx.message.message_id.toString();
    const senderId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    const quotedText = ctx.message.reply_to_message?.text || (ctx.message.reply_to_message as any)?.caption || undefined;

    logMessageReceived(botId, externalMsgId, senderId, ctx.message.text, chatId);

    const payload: InboundMessagePayload = {
      channel: 'telegram',
      bot_id: botId,
      external_message_id: externalMsgId,
      sender_id: senderId,
      sender_name: senderName,
      sender_username: ctx.from.username,
      chat_id: chatId,
      chat_type: ctx.chat.type as any,
      message_type: 'text',
      text: ctx.message.text,
      quoted_text: quotedText,
      timestamp: ctx.message.date,
    };

    // Kirim indikator awal bahwa bot sedang mengetik...
    await ctx.replyWithChatAction('typing').catch(() => {});

    chatPacer.enqueueMessage({
      channel: 'telegram',
      botId,
      senderId,
      chatId,
      messageId: externalMsgId,
      text: ctx.message.text.trim(),
      payload,
      sendPresence: async () => {
        await ctx.replyWithChatAction('typing').catch(() => {});
      },
      onFlush: async (mergedText, latestPayload) => {
        const startTime = Date.now();
        await ctx.replyWithChatAction('typing').catch(() => {});
        try {
          const response = await apiClient.sendInboundMessage({
            ...latestPayload,
            text: mergedText,
          });

          if (response.reply_text) {
            // Hitung delay manusiawi dinamis Telegram (4 - 8 detik)
            const targetDelay = chatPacer.calculateDynamicDelay('telegram', response.reply_text.length);
            const elapsed = Date.now() - startTime;
            const remainingDelay = Math.max(targetDelay - elapsed, 500);

            // Tampilkan typing action selama jeda
            await ctx.replyWithChatAction('typing').catch(() => {});
            await new Promise((resolve) => setTimeout(resolve, remainingDelay));

            const keyboard = telegramView.renderInlineKeyboard(response.action_buttons);
            await ctx.reply(response.reply_text, {
              reply_markup: keyboard,
            });
          }
        } catch (err: any) {
          await ctx.reply('Mohon maaf, terjadi kendala saat memproses pesan Anda. Silakan coba kembali.').catch(() => {});
        }
      },
    });
  }

  /**
   * Menangani pesan yang diedit oleh pengguna Telegram sebelum buffer dikirim.
   */
  async handleEditedTextMessage(ctx: Context): Promise<void> {
    if (!ctx.editedMessage || !ctx.editedMessage.text || !ctx.from || !ctx.me) {
      return;
    }

    const botId = ctx.me.id.toString();
    const senderId = ctx.from.id.toString();
    const messageId = ctx.editedMessage.message_id.toString();
    const newText = ctx.editedMessage.text.trim();

    const updated = chatPacer.updateEditedMessage(
      'telegram',
      botId,
      senderId,
      messageId,
      newText
    );

    if (updated) {
      await ctx.replyWithChatAction('typing').catch(() => {});
    }
  }

  /**
   * Menangani kiriman foto (misal: nota / struk belanja).
   */
  async handlePhotoMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !ctx.message.photo || !ctx.from || !ctx.chat || !ctx.me) {
      return;
    }

    // Ambil foto dengan resolusi tertinggi (elemen terakhir pada array)
    const photos = ctx.message.photo;
    const highestResPhoto = photos[photos.length - 1];
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    const botId = ctx.me.id.toString();
    const externalMsgId = ctx.message.message_id.toString();
    const senderId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();

    logPhotoReceived(botId, externalMsgId, senderId, highestResPhoto.file_id, chatId);

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
          file_size: highestResPhoto.file_size,
        },
      ],
      timestamp: ctx.message.date,
    };

    await ctx.replyWithChatAction('upload_photo').catch(() => {});

    const response = await apiClient.sendInboundMessage(payload);

    if (response.reply_text) {
      const keyboard = telegramView.renderInlineKeyboard(response.action_buttons);
      await ctx.reply(response.reply_text, {
        reply_markup: keyboard,
      });
    }
  }

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

    const response = await apiClient.sendInboundMessage(payload);

    if (response.reply_text) {
      const keyboard = telegramView.renderInlineKeyboard(response.action_buttons);
      await ctx.reply(response.reply_text, {
        reply_markup: keyboard,
      });
    }
  }
}

export const chatController = new ChatController();
