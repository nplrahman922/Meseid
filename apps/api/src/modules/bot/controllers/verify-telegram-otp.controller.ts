import { Tx } from "../../../db/client";
import { successResponse, handleOwnerValidationError } from "../../../logs";
import { verifyTelegramOtp } from "../actions/verify-telegram-otp.action";

/**
 * Controller untuk POST /api/bot/telegram/verify-otp
 * Memvalidasi kode 6 digit OTP yang diminta owner dari bot Telegram.
 */
export async function verifyTelegramOtpController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: { code: string };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  if (!body.code || body.code.trim().length !== 6) {
    return handleOwnerValidationError(
      set,
      "Kode OTP Telegram harus berupa 6 digit angka.",
      "code"
    );
  }

  const result = await runOwnerTx(async (tx) => {
    return await verifyTelegramOtp(tx, owner.id, body.code);
  });

  if (!result.success) {
    set.status = 400;
    return {
      status: "error",
      error: "INVALID_TELEGRAM_OTP",
      message: result.error || "Kode OTP Telegram salah atau sudah kedaluwarsa.",
    };
  }

  return successResponse(
    { verified: true, chatId: result.chatId },
    "Akun Telegram berhasil diverifikasi sebagai Pemilik Toko."
  );
}
