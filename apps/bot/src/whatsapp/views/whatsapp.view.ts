import type { ActionButton } from '../models/types';
import { WhatsAppTextFormatter } from '../formatters/whatsapp-text.formatter';

export class WhatsAppView {
  /**
   * Pesan sambutan ketika pengguna mengetik /start atau menyapa bot
   */
  renderWelcome(pushName?: string, botName: string = 'Asisten Bisnis'): string {
    const greeting = pushName ? `Halo *${pushName}*! 👋` : 'Halo! 👋';
    return (
      `${greeting}\n\n` +
      `Saya adalah *${botName}* berbasis AI untuk pencatatan transaksi & asisten toko Anda di WhatsApp.\n\n` +
      `📌 *Apa yang bisa saya bantu?*\n` +
      `• *Pencatatan Keuangan*: Cukup ketik "Beli telur 2kg 54000" atau "Jual 3 paket ayam 75000"\n` +
      `• *Kirim Foto Struk*: Kirimkan foto nota/struk belanja Anda untuk dibaca otomatis\n` +
      `• *Laporan & Kas*: Ketik "Berapa kas hari ini?"\n\n` +
      `Ketik */help* untuk panduan lengkap atau */status* untuk melihat status koneksi bot.`
    );
  }

  /**
   * Pesan panduan ketika pengguna mengetik /help
   */
  renderHelp(): string {
    return (
      `📖 *Panduan Penggunaan Asisten Bisnis Meseid (WhatsApp)*\n\n` +
      `1. *Mencatat Pengeluaran & Pemasukan*:\n` +
      `   Kirimkan pesan teks biasa dengan nominal, contoh:\n` +
      `   - _"Beli minyak goreng 2 liter 32.000"_\n` +
      `   - _"Pendapatan katering makan siang 350.000"_\n\n` +
      `2. *Pencatatan via Foto Struk*:\n` +
      `   Kirimkan foto nota fisik belanja langsung ke chat ini.\n\n` +
      `3. *Perintah Cepat*:\n` +
      `   • */start* - Memulai ulang interaksi bot\n` +
      `   • */status* - Memeriksa status koneksi bot & backend\n` +
      `   • */help* - Menampilkan panduan ini`
    );
  }

  /**
   * Pesan status koneksi bot WhatsApp
   */
  renderStatus(sessionId: string, phoneNumber: string, isConnected: boolean): string {
    const statusIcon = isConnected ? '🟢 Terhubung (Online)' : '🟡 Menunggu Koneksi';
    return (
      `ℹ️ *Status WhatsApp Bot Meseid*\n\n` +
      `• *ID Sesi*: \`${sessionId}\`\n` +
      `• *Nomor WhatsApp*: ${phoneNumber || 'Belum terautentikasi'}\n` +
      `• *Status Koneksi*: ${statusIcon}\n` +
      `• *Waktu Server*: ${new Date().toLocaleString('id-ID')}`
    );
  }

  /**
   * Format teks balasan yang dilengkapi opsi menu tombol aksi
   */
  renderActionMenu(buttons?: ActionButton[]): string {
    if (!buttons || buttons.length === 0) return '';

    const list = buttons
      .map((btn, idx) => `*[${idx + 1}]* ${btn.label}`)
      .join('\n');

    return `\n\nSilakan pilih opsi:\n${list}\n\n_Ketik angka pilihan Anda (mis. 1 atau 2)._`;
  }

  /**
   * Menggabungkan teks balasan utama dengan menu tombol aksi
   */
  formatReplyWithActions(replyText: string, buttons?: ActionButton[]): string {
    const formatted = WhatsAppTextFormatter.format(replyText);
    if (!buttons || buttons.length === 0) {
      return formatted;
    }
    return `${formatted}${this.renderActionMenu(buttons)}`;
  }
}

export const whatsAppView = new WhatsAppView();
