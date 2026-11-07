import type { Context } from "grammy";
import { telegramLogger } from "../../logs";

export class ContactController {
  /**
   * Menangani penerimaan kontak asli dari Telegram (Share Contact)
   * untuk memvalidasi nomor telepon pemilik toko sebelum menerbitkan OTP.
   */
  async handleContact(ctx: Context): Promise<void> {
    const contact = ctx.message?.contact;
    const fromId = ctx.from?.id;
    const meId = ctx.me?.id;

    if (!contact || !fromId || !meId) return;

    const botId = meId.toString();
    const chatId = fromId.toString();

    // 1. Anti-Spoofing Check: Pastikan kontak berasal dari akun pengguna sendiri (bukan forward vCard)
    if (contact.user_id !== fromId) {
      telegramLogger.warn(
        `Upaya pemalsuan kontak Telegram terdeteksi: contact.user_id (${contact.user_id}) !== from.id (${fromId})`,
        { botId, chatId }
      );

      await ctx.reply(
        "⚠️ *Permintaan Ditolak*\n\n" +
          "Anda harus membagikan kartu kontak asli milik akun Telegram Anda sendiri (bukan meneruskan kontak orang lain).",
        {
          parse_mode: "Markdown",
          reply_markup: { remove_keyboard: true },
        }
      );
      return;
    }

    telegramLogger.info(
      `Memproses verifikasi kontak Telegram (+${contact.phone_number}) dari user ${chatId} untuk bot ${botId}`,
      { action: "verify_telegram_contact", botId, chatId }
    );

    const apiUrl = (
      process.env.API_INTERNAL_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");
    const secret = process.env.INTERNAL_API_SECRET || "";

    try {
      const res = await fetch(
        `${apiUrl}/api/internal/telegram/verify-and-generate-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": secret,
          },
          body: JSON.stringify({
            bot_id: botId,
            chat_id: chatId,
            phone_number: contact.phone_number,
          }),
        }
      );

      const json = (await res.json()) as any;

      if (!res.ok || json.status !== "ok") {
        const errorMsg =
          json.error ||
          "⚠️ Nomor telepon Telegram Anda tidak cocok dengan profil pemilik bisnis di Meseid. Permintaan OTP ditolak demi keamanan.";

        await ctx.reply(errorMsg, {
          parse_mode: "Markdown",
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      const code = json.data?.code;
      const successMessage =
        `✅ *Nomor Telepon Terverifikasi!*\n\n` +
        `Kode OTP Anda:\n` +
        `*${code}*\n\n` +
        `Masukkan 6 digit kode ini pada halaman Overview Meseid untuk menautkan akun Anda sebagai Pemilik Toko.\n` +
        `_(Kode ini berlaku selama 5 menit)_`;

      await ctx.reply(successMessage, {
        parse_mode: "Markdown",
        reply_markup: { remove_keyboard: true },
      });
    } catch (err: any) {
      telegramLogger.error(
        "Kesalahan saat memproses verifikasi kontak Telegram di API",
        err
      );
      await ctx.reply(
        "⚠️ Terjadi kendala saat menghubungi server Meseid. Silakan coba beberapa saat lagi.",
        { reply_markup: { remove_keyboard: true } }
      );
    }
  }
}

export const contactController = new ContactController();
