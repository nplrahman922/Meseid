import type { InboundMessagePayload, InboundApiResponse } from './types';
import { createModuleLogger } from '../../logs';

const apiClientLogger = createModuleLogger('api-client');

export class ApiClient {
  private apiUrl: string;
  private internalSecret: string;
  private timeoutMs: number;

  constructor() {
    this.apiUrl = (process.env.API_INTERNAL_URL || 'http://localhost:3000').replace(/\/+$/, '');
    this.internalSecret = process.env.INTERNAL_API_SECRET || '';
    this.timeoutMs = 15000; // 15 detik timeout untuk pemrosesan AI / DB
  }

  /**
   * Mengirimkan pesan masuk dari Telegram ke endpoint ingestion di Backend API.
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
        apiClientLogger.error(`Gagal meneruskan pesan ke API (${response.status})`, new Error(errorText), {
          targetUrl,
          statusCode: response.status,
          botId: payload.bot_id,
          senderId: payload.sender_id,
        });
        return {
          status: 'error',
          reply_text: 'Mohon maaf, sistem asisten Meseid sedang memproses antrean. Silakan coba beberapa saat lagi.',
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = (await response.json()) as InboundApiResponse;
      apiClientLogger.info(`Berhasil meneruskan pesan ke API untuk sender ${payload.sender_id}`, {
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
        reply_text: 'Mohon maaf, sistem Meseid sedang dalam pemeliharaan sejenak. Pesan Anda telah dicatat.',
        error: errorMessage,
      };
    }
  }
}

export const apiClient = new ApiClient();
