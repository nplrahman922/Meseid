import type { InboundMessagePayload, InboundApiResponse } from './types';
import { createModuleLogger } from '../../logs';

const apiClientLogger = createModuleLogger('whatsapp-api-client');

export class ApiClient {
  private apiUrl: string;
  private internalSecret: string;
  private timeoutMs: number;

  constructor() {
    this.apiUrl = (process.env.API_INTERNAL_URL || 'http://localhost:3000').replace(/\/+$/, '');
    this.internalSecret = process.env.INTERNAL_API_SECRET || '';
    this.timeoutMs = 75000; // 75 detik timeout (cukup untuk multi-turn distillation + code/text generation + secondary guardrail)
  }

  /**
   * Mengirimkan pesan masuk dari WhatsApp ke endpoint ingestion di Backend API.
   */
  async sendInboundMessage(payload: InboundMessagePayload): Promise<InboundApiResponse> {
    const targetUrl = `${this.apiUrl}/api/chat/inbound`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': this.internalSecret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        apiClientLogger.error(`Gagal meneruskan pesan WhatsApp ke API (${response.status})`, new Error(errorText), {
          targetUrl,
          statusCode: response.status,
          botId: payload.bot_id,
          senderId: payload.sender_id,
        });
        return {
          status: 'error',
          reply_text: 'Mohon maaf, sistem asisten Meseid sedang mengalami kendala jaringan. Silakan coba kirim kembali beberapa saat lagi.',
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = (await response.json()) as InboundApiResponse;
      apiClientLogger.info(`Berhasil meneruskan pesan WhatsApp ke API untuk sender ${payload.sender_id}`, {
        botId: payload.bot_id,
        externalMessageId: payload.external_message_id,
      });
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isAbort = err.name === 'AbortError';
      const errorMessage = isAbort ? 'Koneksi ke backend API timeout' : err.message;

      apiClientLogger.warn(`Peringatan koneksi backend (${targetUrl}): ${errorMessage}`, {
        targetUrl,
        botId: payload.bot_id,
        senderId: payload.sender_id,
        isTimeout: isAbort,
      });

      return {
        status: 'error',
        reply_text: 'Mohon maaf, sistem asisten Meseid belum dapat memproses pesan Anda. Data belum tersimpan. Silakan coba kirim kembali beberapa saat lagi.',
        error: errorMessage,
      };
    }
  }

  /**
   * Memeriksa apakah nomor WhatsApp sudah terikat ke owner lain di database API.
   */
  async checkChannelConflict(
    phoneNumber: string,
    sessionId?: string,
    ownerId?: string
  ): Promise<{ isConflict: boolean; existingOwnerId?: string; businessName?: string; reason?: string }> {
    const targetUrl = `${this.apiUrl}/api/internal/channel/check-conflict`;
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': this.internalSecret,
        },
        body: JSON.stringify({
          channel: 'whatsapp',
          external_account_id: phoneNumber,
          session_id: sessionId,
          owner_id: ownerId,
        }),
      });

      if (!response.ok) {
        return { isConflict: false };
      }

      const data = (await response.json()) as any;
      return {
        isConflict: Boolean(data.isConflict),
        existingOwnerId: data.existingOwnerId,
        businessName: data.businessName,
        reason: data.reason,
      };
    } catch (err: any) {
      apiClientLogger.warn(`Gagal memeriksa konflik channel di API: ${err.message}`);
      return { isConflict: false };
    }
  }

  /**
   * Mengirim notifikasi internal ke backend API bahwa sesi WhatsApp telah logout dari HP.
   */
  async notifyWhatsAppLoggedOut(
    sessionId: string,
    ownerId?: string
  ): Promise<boolean> {
    const targetUrl = `${this.apiUrl}/api/internal/whatsapp/on-logged-out`;
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': this.internalSecret,
        },
        body: JSON.stringify({
          session_id: sessionId,
          owner_id: ownerId,
        }),
      });

      if (!response.ok) {
        apiClientLogger.warn(
          `Gagal notifikasi WhatsApp logged out ke API (${targetUrl}): status ${response.status}`
        );
        return false;
      }

      apiClientLogger.info(
        `Sukses notifikasi WhatsApp logged out untuk sesi '${sessionId}' ke API.`
      );
      return true;
    } catch (err: any) {
      apiClientLogger.warn(
        `Gagal mengirim notifikasi WhatsApp logged out ke API: ${err.message}`
      );
      return false;
    }
  }
}

export const apiClient = new ApiClient();
