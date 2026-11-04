import qrcode from 'qrcode-terminal';
import type { WhatsAppSessionEntry } from '../session/session.types';
import { validateConnectionConflict } from './connection-conflict.validator';
import { sendWhatsAppSecurityAlert } from '../dispatch/security-alert.sender';
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
        const rawId = sock.user?.id;
        const phone = rawId ? rawId.replace(/:\d+@.*$/, '').replace(/@.*$/, '') : undefined;
        entry.phoneNumber = phone;

        if (phone) {
          // Lakukan validasi anti-duplikasi kepemilikan nomor
          validateConnectionConflict(phone, sessionId, config.ownerId)
            .then(async (validation) => {
              if (validation.isConflict) {
                whatsappLogger.warn(
                  `Menolak koneksi WhatsApp sesi '${sessionId}' karena nomor '${phone}' sudah terdaftar pada akun lain.`
                );

                // 1. Kirim notifikasi peringatan keamanan langsung ke nomor WhatsApp tersebut
                await sendWhatsAppSecurityAlert(sock, phone).catch(() => {});

                // Berikan jeda 1.5 detik agar pesan terkirim keluar sebelum socket ditutup
                await new Promise((resolve) => setTimeout(resolve, 1500));

                // 2. Set status menjadi conflict (Opsi B: tahan pada status conflict)
                entry.status = 'conflict';
                entry.conflictReason = validation.reason;
                entry.qr = undefined;

                // 3. Putuskan koneksi soket & bersihkan sesi sementara di Redis
                try {
                  await sock.logout();
                } catch {
                  sock.end(undefined);
                }

                if (entry.clearSession) {
                  await entry.clearSession().catch(() => {});
                }
                return;
              }

              // Jika bukan konflik, aktifkan status open secara normal
              entry.status = 'open';
              entry.qr = undefined;
              entry.reconnectAttempts = 0;
              logWhatsAppConnected(sessionId, phone);
            })
            .catch((err) => {
              whatsappLogger.error(
                `Peringatan saat validasi konflik WhatsApp: ${err.message}`,
                err
              );
              entry.status = 'open';
              entry.qr = undefined;
              entry.reconnectAttempts = 0;
              logWhatsAppConnected(sessionId, phone);
            });
        } else {
          entry.status = 'open';
          entry.qr = undefined;
          entry.reconnectAttempts = 0;
          logWhatsAppConnected(sessionId, phone);
        }
      } else if (connection === 'close') {
        // Jika sesi sedang dalam status conflict, jangan ditimpa menjadi close atau auto-reconnect
        if (entry.status === 'conflict') {
          whatsappLogger.info(`Koneksi sesi '${sessionId}' ditutup karena terdeteksi konflik.`);
          return;
        }

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
