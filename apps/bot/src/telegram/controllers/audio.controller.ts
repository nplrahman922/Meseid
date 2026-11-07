import type { Context } from 'grammy';
import { apiClient } from '../models/api.client';
import { telegramView } from '../views/telegram.view';
import { telegramMediaDownloader } from '../media/telegram-media.downloader';
import { TelegramTextFormatter } from '../formatters/telegram-text.formatter';
import type { InboundMessagePayload } from '../models/types';
import { telegramLogger } from '../../logs';

export class AudioController {
  /**
   * Menangani rekaman suara langsung (Voice Note) pengguna Telegram.
   */
  async handleVoiceMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !ctx.message.voice || !ctx.from || !ctx.chat || !ctx.me) {
      return;
    }

    const voice = ctx.message.voice;
    await this.processAudio(
      ctx,
      voice.file_id,
      voice.mime_type || 'audio/ogg',
      voice.file_size,
      'voice'
    );
  }

  /**
   * Menangani kiriman berkas audio (MP3/WAV/M4A) dari pengguna Telegram.
   */
  async handleAudioFileMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !ctx.message.audio || !ctx.from || !ctx.chat || !ctx.me) {
      return;
    }

    const audio = ctx.message.audio;
    await this.processAudio(
      ctx,
      audio.file_id,
      audio.mime_type || 'audio/mpeg',
      audio.file_size,
      'audio'
    );
  }

  /**
   * Alur terpadu pengunduhan rekaman suara, transmisi Base64, dan delegasi ke backend API.
   */
  private async processAudio(
    ctx: Context,
    fileId: string,
    mimeType: string,
    fileSize?: number,
    audioType: 'voice' | 'audio' = 'voice'
  ): Promise<void> {
    const senderName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ');
    const botId = ctx.me?.id.toString() || '';
    const externalMsgId = ctx.message?.message_id.toString() || '';
    const senderId = ctx.from?.id.toString() || '';
    const chatId = ctx.chat?.id.toString() || '';

    telegramLogger.info(`[Audio Controller] Menerima pesan suara (${audioType}) dari ${senderId} [file: ${fileId}]`);

    // Tampilkan indikator aksi bot sedang merekam/memproses suara
    await ctx.replyWithChatAction('record_voice').catch(() => {});

    // Unduh berkas audio dari server Telegram Cloud
    const downloaded = await telegramMediaDownloader.downloadAudio(ctx, fileId, mimeType);

    const payload: InboundMessagePayload = {
      channel: 'telegram',
      bot_id: botId,
      external_message_id: externalMsgId,
      sender_id: senderId,
      sender_name: senderName,
      sender_username: ctx.from?.username,
      chat_id: chatId,
      chat_type: ctx.chat?.type as any,
      message_type: 'audio',
      text: ctx.message?.caption || '',
      attachments: [
        {
          file_id: fileId,
          file_type: 'audio',
          mime_type: downloaded?.mimeType || mimeType,
          file_size: downloaded?.buffer.length || fileSize,
          data_base64: downloaded?.base64,
        },
      ],
      timestamp: ctx.message?.date || Math.floor(Date.now() / 1000),
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
      telegramLogger.error(`Gagal memproses pesan suara Telegram: ${err.message}`, err, {
        botId,
        senderId,
        fileId,
      });

      await ctx.reply(
        'Mohon maaf, terjadi kendala saat memproses rekaman suara Anda. Silakan coba kembali atau ketik via teks ya.'
      ).catch(() => {});
    }
  }
}

export const audioController = new AudioController();
