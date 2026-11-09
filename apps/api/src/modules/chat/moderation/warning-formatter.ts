import type { ModerationCategory } from "./moderation.types";

/**
 * Pembuat Teks Peringatan Moderasi Sopan & Tegas
 */
export class WarningFormatter {
  static formatWarning(category: ModerationCategory, senderName?: string): string {
    const mention = senderName ? `@${senderName}` : "Kak";

    switch (category) {
      case "sara":
        return `⚠️ Peringatan untuk ${mention}: Mohon untuk tidak menggunakan ujaran kebencian atau kata-kata yang menyinggung SARA di grup ini. Mari kita jaga etika dan saling menghormati ya. Terima kasih! 🙏`;

      case "profanity":
        return `⚠️ Pemberitahuan untuk ${mention}: Mohon untuk tidak menggunakan perkataan kasar atau vulgar di sini demi kenyamanan bersama. Terima kasih atas pengertiannya ya Kak! 🙏`;

      case "spam":
        return `🚫 Peringatan untuk ${mention}: Dilarang mengirimkan promosi, tautan spam, judi online, atau aktivitas terlarang di dalam grup ini. Mohon patuhi tata tertib grup! ⚠️`;

      case "custom":
        return `⚠️ Pemberitahuan untuk ${mention}: Mohon maaf, kata kunci atau topik tersebut tidak diperkenankan untuk dibahas di sini sesuai kebijakan Owner. Silakan hubungi admin langsung jika butuh bantuan ya. 😊`;

      default:
        return `⚠️ Pemberitahuan untuk ${mention}: Pesan Anda memuat kata yang melanggar ketentuan komunikasi. Mohon gunakan bahasa yang santun ya Kak. 🙏`;
    }
  }
}
