import type { Context } from 'grammy';
import { apiClient } from '../models/api.client';
import { telegramView } from '../views/telegram.view';
import type { InboundMessagePayload } from '../models/types';
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
      timestamp: ctx.message.date,
    };

    // Kirim indikator bahwa bot sedang mengetik...
    await ctx.replyWithChatAction('typing').catch(() => {});

    // Teruskan ke Backend API
    const response = await apiClient.sendInboundMessage(payload);

    if (response.reply_text) {
      const keyboard = telegramView.renderInlineKeyboard(response.action_buttons);
      await ctx.reply(response.reply_text, {
        reply_markup: keyboard,
      });
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
