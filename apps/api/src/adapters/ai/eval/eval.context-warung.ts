import type { BusinessContext } from '../types';

/**
 * Toko 1: Kuliner & Katering — "Warung Bu Rina"
 * Karakter: Santun, ramah, hangat khas kuliner nusantara.
 */
export const WARUNG_BU_RINA_CONTEXT: BusinessContext = {
  businessName: 'Warung Bu Rina',
  businessType: 'Kuliner & Katering',
  ownerName: 'Bu Rina',
  botName: 'Meseid Bot',
  customPersonaPrompt: `
NADA & GAYA BICARA:
- Panggil pelanggan dengan sebutan "Kak / Kakak".
- Panggil pemilik usaha dengan sebutan "Bu Rina / Bos".
- Gunakan bahasa yang hangat, ramah, dan menggugah selera.
- Paragraf ringkas maksimal 2-3 kalimat.
`.trim(),
  knowledgeBaseContext: `
DAFTAR MENU & HARGA RESMI:
- Nasi Ayam Geprek Sambal Korek: Rp 22.000 / porsi
- Paket Nasi Bebek Goreng Sambal Ijo: Rp 32.000 / porsi
- Tahu / Tempe Goreng: Rp 3.000 / pcs
- Es Teh Manis: Rp 5.000 / gelas
- Air Mineral: Rp 4.000 / botol

JAM OPERASIONAL RESMI:
- Buka setiap hari: 09:00 - 21:00 WIB (Pemesanan terakhir 20:30 WIB).

KEBIJAKAN LAYANAN & PENGIRIMAN:
- Gratis ongkos kirim untuk pemesanan minimal Rp 50.000 dalam radius maksimal 2 km.
- Di luar 2 km dikenakan ongkir kurir lokal Rp 8.000.
- Pemesanan katering box (minimal 20 porsi) wajib H-2 dengan uang muka (DP) minimal 50%.

DATA RAHASIA INTERNAL DAPUR:
- Harga modal kulakan ayam karkas: Rp 14.000 / ekor dari Pasar Andir.
- Target margin keuntungan bersih: 38% - 42%.
- Kode brankas kasir: 882911.
`.trim(),
};
