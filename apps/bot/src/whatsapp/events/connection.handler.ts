import qrcode from 'qrcode-terminal';
import type { WhatsAppSessionEntry } from '../session/session.types';
import { validateConnectionConflict } from './connection-conflict.validator';
import { sendWhatsAppSecurityAlert } from '../dispatch/security-alert.sender';
import { apiClient } from '../models/api.client';
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
      if (entry.isDestroyed) return;

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
          const resolvedOwnerId =
            config.ownerId ||
            (sessionId.startsWith('owner_')
              ? sessionId.replace(/^owner_/, '').replace(/_/g, '-')
              : undefined);

          // Lakukan validasi anti-duplikasi kepemilikan nomor
          validateConnectionConflict(phone, sessionId, resolvedOwnerId)
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
        if (entry.isDestroyed) return;

        // Jika sesi sedang dalam status conflict, jangan ditimpa menjadi close atau auto-reconnect
        if (entry.status === 'conflict') {
          whatsappLogger.info(`Koneksi sesi '${sessionId}' ditutup karena terdeteksi konflik.`);
          return;
        }

        const err = lastDisconnect?.error as any;
        const statusCode = err?.output?.statusCode || err?.status || err?.code;
        const isLoggedOut =
          statusCode === disconnectReason.loggedOut ||
          statusCode === 401 ||
          statusCode === 403;

        if (isLoggedOut) {
          entry.status = 'logged_out';
          entry.qr = undefined;
          if (entry.reconnectTimer) {
            clearTimeout(entry.reconnectTimer);
            entry.reconnectTimer = undefined;
          }

          logWhatsAppDisconnected(
            sessionId,
            `Sesi WhatsApp telah logout permanen (${statusCode || 401}).`
          );

          if (entry.clearSession) {
            entry.clearSession().catch((err) => {
              whatsappLogger.warn(`Gagal membersihkan sesi saat logout: ${err.message}`);
            });
          }

          // Kirim notifikasi ke Backend API agar status di PostgreSQL disinkronkan menjadi 'disconnected'
          const resolvedOwnerId =
            config.ownerId ||
            (sessionId.startsWith('owner_')
              ? sessionId.replace(/^owner_/, '').replace(/_/g, '-')
              : undefined);

          apiClient
            .notifyWhatsAppLoggedOut(sessionId, resolvedOwnerId)
            .catch((err) => {
              whatsappLogger.warn(`Peringatan saat sinkronisasi logout ke API: ${err.message}`);
            });

          return;
        }

        // Jika Baileys meminta restart (kode 515) setelah scan QR, SEGERA reconnect agar handshake otentikasi selesai
        const isRestartRequired =
          statusCode === disconnectReason.restartRequired || statusCode === 515;

        if (isRestartRequired) {
          whatsappLogger.info(
            `Sesi '${sessionId}' meminta restart setelah pemindaian QR (kode 515). Menghubungkan ulang segera untuk menyelesaikan otentikasi...`
          );
          if (!options.isShuttingDown() && !entry.isDestroyed) {
            if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
            entry.reconnectTimer = setTimeout(() => {
              if (entry.isDestroyed) return;
              options.onReconnect(sessionId).catch((err) => {
                logWhatsAppError(sessionId, `Gagal reconnect setelah scan: ${err.message}`, err);
              });
            }, 500);
          }
          return;
        }

        // Jika sesi sedang dalam mode QR / belum terotentikasi, JANGAN melakukan auto-reconnect berkala!
        // Biarkan Baileys mengelola rotasi QR internalnya sendiri sampai pengguna berhasil scan atau klik reset manual.
        const isQrOrUnauthenticated =
          entry.status === 'qr_ready' ||
          !entry.phoneNumber ||
          entry.status === 'connecting';

        if (isQrOrUnauthenticated) {
          entry.status = 'close';
          entry.qr = undefined;
          whatsappLogger.info(
            `Sesi '${sessionId}' dalam mode QR ditutup (${statusCode || 'manual/timeout'}). Menahan auto-reconnect agar QR Code stabil dan tidak looping.`
          );
          return;
        }

        entry.status = 'close';
        logWhatsAppDisconnected(
          sessionId,
          `Koneksi terputus (${statusCode || 'Unknown'}). Menjadwalkan auto-reconnect...`
        );

        if (!options.isShuttingDown() && !entry.isDestroyed) {
          const delayMs = Math.min(
            30000,
            3000 * Math.pow(2, Math.min(entry.reconnectAttempts, 4))
          );
          entry.reconnectAttempts++;

          if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
          entry.reconnectTimer = setTimeout(() => {
            if (entry.isDestroyed) return;
            options.onReconnect(sessionId).catch((err) => {
              logWhatsAppError(sessionId, `Gagal reconnect: ${err.message}`, err);
            });
          }, delayMs);
        }
      }
    });
  }
}
