import { whatsAppView } from '../views/whatsapp.view';
import { whatsappLogger } from '../../logs';
import { sessionRegistry } from '../session/session.registry';
import type { OutboundMessagePayload, OutboundApiResponse } from '../models/types';

export class OutboundSender {
  /**
   * Mengirimkan pesan outbound dari Backend API ke nomor WhatsApp tujuan melalui Baileys socket.
   */
  static async sendMessage(payload: OutboundMessagePayload): Promise<OutboundApiResponse> {
    const sessionKey = payload.session_id || payload.bot_id;
    const entry = sessionRegistry.get(sessionKey);

    if (!entry) {
      const errMsg = sessionKey
        ? `Sesi WhatsApp '${sessionKey}' tidak ditemukan di pool aktif.`
        : 'Tidak ada sesi WhatsApp yang aktif untuk mengirim pesan.';
      whatsappLogger.error(`[Outbound Error] ${errMsg}`, undefined, {
        action: 'send_message_failed',
        payload,
      });
      return { success: false, error: errMsg };
    }

    if (entry.status !== 'open') {
      const errMsg = `Sesi WhatsApp '${entry.sessionId}' belum terhubung (status: ${entry.status}).`;
      whatsappLogger.warn(`[Outbound Warning] ${errMsg}`, {
        action: 'send_message_not_ready',
        sessionId: entry.sessionId,
      });
      return { success: false, error: errMsg };
    }

    try {
      let recipientJid = payload.recipient_id.trim();
      if (!recipientJid.includes('@')) {
        const cleanNumber = recipientJid.replace(/[^0-9]/g, '');
        recipientJid = `${cleanNumber}@s.whatsapp.net`;
      }

      const formattedMessage = whatsAppView.formatReplyWithActions(
        payload.message,
        payload.options?.action_buttons
      );

      const sent = await entry.sock.sendMessage(recipientJid, {
        text: formattedMessage,
      });

      const messageId = sent?.key?.id ?? undefined;

      whatsappLogger.info(`Pesan outbound WhatsApp terkirim ke ${recipientJid}`, {
        action: 'send_message_success',
        sessionId: entry.sessionId,
        recipientJid,
        messageId,
      });

      return {
        success: true,
        message_id: messageId,
      };
    } catch (err: any) {
      whatsappLogger.error(
        `Gagal kirim pesan WhatsApp ke ${payload.recipient_id}: ${err.message}`,
        err,
        {
          action: 'send_message_error',
          sessionId: entry.sessionId,
          recipientId: payload.recipient_id,
        }
      );
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
