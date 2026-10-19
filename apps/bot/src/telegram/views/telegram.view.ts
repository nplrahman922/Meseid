import { InlineKeyboard } from 'grammy';
import type { ActionButton } from '../models/types';

export class TelegramView {
  /**
   * Pesan sambutan ketika pengguna mengetik /start
   */
  renderWelcome(firstName?: string, botName: string = 'Asisten Bisnis'): string {
    const greeting = firstName ? `Halo ${firstName}! 👋` : 'Halo! 👋';
    return (
      `${greeting}\n\n` +
      `Saya adalah **${botName}** berbasis AI untuk pencatatan transaksi & asisten toko Anda.\n\n` +
      `📌 **Apa yang bisa saya bantu?**\n` +
      `• *Pencatatan Keuangan*: Cukup ketik "Beli telur 2kg 54000" atau "Jual 3 paket ayam 75000"\n` +
      `• *Kirim Foto Struk*: Kirimkan foto nota/struk belanja Anda untuk dibaca otomatis\n` +
      `• *Laporan & Kas*: Ketik "Berapa kas hari ini?"\n\n` +
      `Ketik /help untuk panduan lengkap atau /status untuk melihat koneksi bot.`
    );
  }

  /**
   * Pesan panduan ketika pengguna mengetik /help
   */
  renderHelp(): string {
    return (
      `📖 **Panduan Penggunaan Asisten Bisnis Meseid**\n\n` +
      `1. **Mencatat Pengeluaran & Pemasukan**:\n` +
      `   Kirimkan pesan teks biasa dengan nominal, contoh:\n` +
      `   - *"Beli minyak goreng 2 liter 32.000"*\n` +
      `   - *"Pendapatan katering makan siang 350.000"*\n\n` +
      `2. **Pencatatan via Foto Struk**:\n` +
      `   Kirimkan foto nota fisik Anda langsung ke chat ini.\n\n` +
      `3. **Perintah Cepat**:\n` +
      `   • /start - Memulai ulang interaksi bot\n` +
      `   • /status - Memeriksa status koneksi bot & backend\n` +
      `   • /help - Menampilkan panduan ini`
    );
  }

  /**
   * Pesan status koneksi bot
   */
  renderStatus(botName: string, botId: string, mode: string, isConnected: boolean): string {
    const statusIcon = isConnected ? '🟢 Aktif' : '🟡 Menunggu Backend';
    return (
      `ℹ️ **Status Bot Meseid**\n\n` +
      `• **Nama Bot**: ${botName}\n` +
      `• **Bot ID**: \`${botId}\`\n` +
      `• **Mode Koneksi**: ${mode.toUpperCase()}\n` +
      `• **Status Server**: ${statusIcon}\n` +
      `• **Waktu Server**: ${new Date().toLocaleString('id-ID')}`
    );
  }

  /**
   * Membuat InlineKeyboard grammY dari array tombol aksi
   */
  renderInlineKeyboard(buttons?: ActionButton[]): InlineKeyboard | undefined {
    if (!buttons || buttons.length === 0) return undefined;

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      keyboard.text(btn.label, btn.callback_data);
      // Setiap 2 tombol buat baris baru
      if ((i + 1) % 2 === 0 && i < buttons.length - 1) {
        keyboard.row();
      }
    }
    return keyboard;
  }
}

export const telegramView = new TelegramView();
