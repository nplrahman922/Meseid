import { sessionRegistry } from '../session/session.registry';
import { apiClient } from '../models/api.client';
import { whatsappLogger } from '../../logs';

export interface ConnectionConflictValidation {
  isConflict: boolean;
  reason?: string;
}

/**
 * Memvalidasi apakah nomor WhatsApp yang baru terhubung mengalami konflik
 * kepemilikan dengan sesi lain di memori bot atau di database backend Meseid.
 */
export async function validateConnectionConflict(
  phone: string,
  sessionId: string,
  ownerId?: string
): Promise<ConnectionConflictValidation> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  // 1. Cek duplikasi di level in-memory session registry (pada instance Bot Gateway yang sama)
  for (const otherSession of sessionRegistry.getAll().values()) {
    if (
      otherSession.sessionId !== sessionId &&
      otherSession.status === 'open' &&
      otherSession.phoneNumber &&
      otherSession.phoneNumber.replace(/[^0-9]/g, '') === cleanPhone
    ) {
      whatsappLogger.warn(
        `Konflik in-memory: Nomor ${cleanPhone} sudah aktif pada sesi '${otherSession.sessionId}'`
      );
      return {
        isConflict: true,
        reason: `Nomor WhatsApp ini sudah aktif pada sesi bisnis lain ('${otherSession.sessionId}').`,
      };
    }
  }

  // 2. Cek duplikasi di level database PostgreSQL melalui Backend API
  try {
    const apiCheck = await apiClient.checkChannelConflict(cleanPhone, sessionId, ownerId);
    if (apiCheck.isConflict) {
      whatsappLogger.warn(
        `Konflik database: Nomor ${cleanPhone} sudah terdaftar pada Owner ID '${apiCheck.existingOwnerId}'`
      );
      return {
        isConflict: true,
        reason:
          apiCheck.reason ||
          `Nomor WhatsApp ini sudah terdaftar pada akun bisnis lain di Meseid.`,
      };
    }
  } catch (err: any) {
    whatsappLogger.warn(
      `Peringatan saat memeriksa konflik channel di API: ${err.message}. Melanjutkan inisialisasi.`
    );
  }

  return { isConflict: false };
}
