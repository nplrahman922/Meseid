import {
  getBaileys,
  type WASocket,
  type WAMessage,
} from '../baileys.loader';
import { apiClient } from '../models/api.client';
import { whatsAppView } from '../views/whatsapp.view';
import type { InboundMessagePayload } from '../models/types';
import { chatPacer } from '../../common/chat.pacer';
import {
  logWhatsAppMessageReceived,
  logWhatsAppMediaReceived,
  logWhatsAppCallbackReceived,
  whatsappLogger,
} from '../../logs';

export class ChatController {
  /**
   * Menyelesaikan sender ID dari WhatsApp JID.
   * Jika berupa WhatsApp LID (Linked Device Identifier, misal: 45273518715014@lid),
   * coba selesaikan ke nomor telepon asli via Baileys Signal Repository reverse mapping.
   */
  private async resolveSenderId(sock: WASocket, senderJid: string): Promise<string> {
    let senderId = senderJid.replace(/@.*$/, '');
    if (senderJid.endsWith('@lid') && (sock as any).signalRepository?.lidMapping?.getPNForLID) {
      try {
        const resolvedPn = await (sock as any).signalRepository.lidMapping.getPNForLID(senderJid);
        if (resolvedPn) {
          senderId = resolvedPn.replace(/:\d+@.*$/, '').replace(/@.*$/, '');
        }
      } catch {
        // Fallback jika belum ter-cache
      }
    }
    return senderId;
  }

  /**
   * Menangani pesan teks biasa dari pengguna WhatsApp.
   */
  async handleTextMessage(
    sock: WASocket,
    msg: WAMessage,
    text: string,
    sessionId: string,
    botPhoneNumber: string,
    quotedText?: string
  ): Promise<void> {
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || !msg.key.id) return;

    // Nomor pengirim (jika di grup, ambil participant)
    const senderJid = msg.key.participant || remoteJid;
    const senderId = await this.resolveSenderId(sock, senderJid);
    const senderName = msg.pushName || senderId;
    const isGroup = remoteJid.endsWith('@g.us');
    const externalMsgId = msg.key.id;

    logWhatsAppMessageReceived(sessionId, externalMsgId, senderId, text, remoteJid);

    const payload: InboundMessagePayload = {
      channel: 'whatsapp',
      bot_id: botPhoneNumber || sessionId,
      external_message_id: externalMsgId,
      sender_id: senderId,
      sender_name: senderName,
      chat_id: remoteJid,
      chat_type: isGroup ? 'group' : 'private',
      message_type: 'text',
      text: text.trim(),
      quoted_text: quotedText,
      is_from_me: Boolean(msg.key.fromMe),
      timestamp: Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
    };

    const botId = botPhoneNumber || sessionId;

    chatPacer.enqueueMessage({
      channel: 'whatsapp',
      botId,
      senderId,
      chatId: remoteJid,
      messageId: externalMsgId,
      text: text.trim(),
      payload,
      sendPresence: async () => {
        await sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});
      },
      onFlush: async (mergedText, latestPayload) => {
        const startTime = Date.now();
        await sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});
        try {
          const response = await apiClient.sendInboundMessage({
            ...latestPayload,
            text: mergedText,
          });

          if (response.reply_text) {
            // Hitung delay manusiawi dinamis (7 - 15 detik)
            const targetDelay = chatPacer.calculateDynamicDelay('whatsapp', response.reply_text.length);
            const elapsed = Date.now() - startTime;
            const remainingDelay = Math.max(targetDelay - elapsed, 1000);

            // Pertahankan status composing selama sisa waktu mengetik
            await sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});
            await new Promise((resolve) => setTimeout(resolve, remainingDelay));

            const fullMessage = whatsAppView.formatReplyWithActions(
              response.reply_text,
              response.action_buttons
            );
            await sock.sendMessage(remoteJid, { text: fullMessage });
          }
        } finally {
          await sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
        }
      },
    });
  }

  /**
   * Menangani kiriman media foto/struk belanja dari pengguna WhatsApp.
   */
  async handlePhotoMessage(
    sock: WASocket,
    msg: WAMessage,
    caption: string,
    sessionId: string,
    botPhoneNumber: string
  ): Promise<void> {
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || !msg.key.id) return;

    const senderJid = msg.key.participant || remoteJid;
    const senderId = await this.resolveSenderId(sock, senderJid);
    const senderName = msg.pushName || senderId;
    const isGroup = remoteJid.endsWith('@g.us');
    const externalMsgId = msg.key.id;

    logWhatsAppMediaReceived(sessionId, externalMsgId, senderId, 'photo', remoteJid);

    // Tampilkan indikator sedang memproses/mengetik
    await sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

    let base64Data: string | undefined;
    try {
      const { downloadMediaMessage } = await getBaileys();
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: whatsappLogger as any,
          reuploadRequest: sock.updateMediaMessage,
        }
      );
      if (Buffer.isBuffer(buffer)) {
        base64Data = buffer.toString('base64');
      }
    } catch (err: any) {
      whatsappLogger.warn(`Gagal mengunduh buffer media WhatsApp: ${err.message}`, {
        externalMsgId,
        sessionId,
      });
    }

    const payload: InboundMessagePayload = {
      channel: 'whatsapp',
      bot_id: botPhoneNumber || sessionId,
      external_message_id: externalMsgId,
      sender_id: senderId,
      sender_name: senderName,
      chat_id: remoteJid,
      chat_type: isGroup ? 'group' : 'private',
      message_type: 'photo',
      text: caption,
      attachments: [
        {
          file_id: externalMsgId,
          file_type: 'photo',
          mime_type: 'image/jpeg',
          data_base64: base64Data,
        },
      ],
      timestamp: Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
    };

    try {
      const response = await apiClient.sendInboundMessage(payload);

      if (response.reply_text) {
        const fullMessage = whatsAppView.formatReplyWithActions(
          response.reply_text,
          response.action_buttons
        );
        await sock.sendMessage(remoteJid, { text: fullMessage });
      }
    } finally {
      await sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
    }
  }

  /**
   * Menangani interaksi tombol callback atau pemilihan opsi respon
   */
  async handleCallbackAction(
    sock: WASocket,
    msg: WAMessage,
    callbackData: string,
    sessionId: string,
    botPhoneNumber: string
  ): Promise<void> {
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || !msg.key.id) return;

    const senderJid = msg.key.participant || remoteJid;
    const senderId = await this.resolveSenderId(sock, senderJid);
    const senderName = msg.pushName || senderId;
    const isGroup = remoteJid.endsWith('@g.us');
    const externalMsgId = msg.key.id;

    logWhatsAppCallbackReceived(sessionId, callbackData, senderId);

    const payload: InboundMessagePayload = {
      channel: 'whatsapp',
      bot_id: botPhoneNumber || sessionId,
      external_message_id: externalMsgId,
      sender_id: senderId,
      sender_name: senderName,
      chat_id: remoteJid,
      chat_type: isGroup ? 'group' : 'private',
      message_type: 'callback',
      callback_data: callbackData,
      timestamp: Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
    };

    await sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

    try {
      const response = await apiClient.sendInboundMessage(payload);

      if (response.reply_text) {
        const fullMessage = whatsAppView.formatReplyWithActions(
          response.reply_text,
          response.action_buttons
        );
        await sock.sendMessage(remoteJid, { text: fullMessage });
      }
    } finally {
      await sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
    }
  }
}

export const chatController = new ChatController();
