import qrcode from 'qrcode-terminal';
import type { WhatsAppSessionEntry } from '../session/session.types';
import {
  whatsappLogger,
  logWhatsAppConnected,
  logWhatsAppDisconnected,
  logWhatsAppQrGenerated,
  logWhatsAppError,
} from '../../logs';

export interface ConnectionHandlerOptions {
  onReconnect: (sessionId: string) => Promise<void>;
  isShuttingDown: () => boolean;
}

export class ConnectionEventHandler {
  /**
   * Mengikat event listener 'connection.update' pada Baileys socket.
   */
  static attach(
    entry: WhatsAppSessionEntry,
    disconnectReason: any,
    options: ConnectionHandlerOptions
  ): void {
    const { sock, sessionId, config } = entry;

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        entry.qr = qr;
        entry.status = 'qr_ready';
        logWhatsAppQrGenerated(sessionId);

        if (config.printQRInTerminal) {
          console.log('\n======================================================');
          console.log(`📱 SCAN QR CODE WHATSAPP (Sesi: ${sessionId})`);
          console.log('======================================================\n');
          qrcode.generate(qr, { small: true });
          console.log(`\nAtau buka di browser: http://localhost:${process.env.PORT || 3001}/whatsapp/qr/${sessionId}\n`);
        }
      }

      if (connection === 'open') {
        entry.status = 'open';
        entry.qr = undefined;
        entry.reconnectAttempts = 0;

        const rawId = sock.user?.id;
        const phone = rawId ? rawId.replace(/:\d+@.*$/, '').replace(/@.*$/, '') : undefined;
        entry.phoneNumber = phone;

        logWhatsAppConnected(sessionId, phone);
      } else if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const isLoggedOut = statusCode === disconnectReason.loggedOut;

        if (isLoggedOut) {
          entry.status = 'logged_out';
          logWhatsAppDisconnected(
            sessionId,
            'Sesi WhatsApp telah logout permanen (401).'
          );
          if (entry.clearSession) {
            entry.clearSession().catch((err) => {
              whatsappLogger.warn(`Gagal membersihkan sesi saat logout: ${err.message}`);
            });
          }
        } else {
          entry.status = 'close';
          logWhatsAppDisconnected(
            sessionId,
            `Koneksi terputus (${statusCode || 'Unknown'}). Menjadwalkan auto-reconnect...`
          );

          if (!options.isShuttingDown()) {
            const delayMs = Math.min(
              30000,
              3000 * Math.pow(2, Math.min(entry.reconnectAttempts, 4))
            );
            entry.reconnectAttempts++;

            if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
            entry.reconnectTimer = setTimeout(() => {
              options.onReconnect(sessionId).catch((err) => {
                logWhatsAppError(sessionId, `Gagal reconnect: ${err.message}`, err);
              });
            }, delayMs);
          }
        }
      }
    });
  }
}
