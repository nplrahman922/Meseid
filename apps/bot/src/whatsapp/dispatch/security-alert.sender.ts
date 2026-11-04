import type { WASocket } from '../baileys.loader';
import { whatsappLogger } from '../../logs';

export const SECURITY_ALERT_MESSAGE = `⚠️ *PERINGATAN KEAMANAN MESEID* ⚠️

Halo,
Sistem kami mendeteksi upaya penautan nomor WhatsApp ini ke akun bisnis baru di Meseid.

Demi keamanan akun dan kerahasiaan data bisnis Anda, sistem secara otomatis *MENOLAK* koneksi baru tersebut.

ℹ️ *Apa yang harus Anda lakukan?*
1. *Jika ini BUKAN Anda:*
   Abaikan pesan ini. Nomor Anda tetap aman dan terhubung dengan akun bisnis lama Anda.

2. *Jika ini MEMANG akun baru Anda:*
   Silakan buka dashboard Meseid pada akun lama Anda, lalu lakukan *'Disconnect' / 'Putus Sambungan'* terlebih dahulu sebelum menautkannya ke akun baru.

_Pesan ini dikirim otomatis oleh sistem keamanan Meseid Bot._`;

/**
 * Mengirim pesan notifikasi peringatan keamanan langsung ke nomor WhatsApp
 * pemilik saat terdeteksi upaya duplikasi/penautan nomor ke akun lain.
 */
export async function sendWhatsAppSecurityAlert(
  sock: WASocket,
  targetPhone: string
): Promise<boolean> {
  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return false;

  const targetJid = `${cleanPhone}@s.whatsapp.net`;

  try {
    whatsappLogger.warn(`Mengirim notifikasi peringatan keamanan ke WhatsApp: ${cleanPhone}`);
    await sock.sendMessage(targetJid, { text: SECURITY_ALERT_MESSAGE });
    return true;
  } catch (err: any) {
    whatsappLogger.error(
      `Gagal mengirim notifikasi keamanan ke WhatsApp (${cleanPhone}): ${err.message}`,
      err
    );
    return false;
  }
}
