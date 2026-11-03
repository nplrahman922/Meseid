import { Tx } from "../../db/client";
import { successResponse, handleOwnerValidationError } from "../../logs";
import { sendOtp, verifyOtp } from "./bot.otp.service";
import {
  getWhatsappStatus,
  resetWhatsappSession,
  verifyTelegramBotToken,
} from "./bot.gateway.client";

/**
 * Controller for GET /api/bot/whatsapp/status
 */
export async function getWhatsappStatusController({
  query,
}: {
  query?: { sessionId?: string };
}) {
  const sessionId = query?.sessionId || "default";
  const result = await getWhatsappStatus(sessionId);
  return successResponse({
    whatsapp: result,
  });
}

/**
 * Controller for POST /api/bot/whatsapp/reset
 */
export async function resetWhatsappSessionController({
  body,
  set,
}: {
  body?: { sessionId?: string };
  set: { status?: number | string };
}) {
  const sessionId = body?.sessionId || "default";
  const result = await resetWhatsappSession(sessionId);
  if (!result.success) {
    set.status = 500;
    return {
      status: "error",
      error: "RESET_FAILED",
      message: result.error || "Gagal mereset sesi WhatsApp.",
    };
  }
  return successResponse(result, "Sesi WhatsApp berhasil direset.");
}

/**
 * Controller for POST /api/bot/telegram/verify
 */
export async function verifyTelegramTokenController({
  body,
  set,
}: {
  body: { token: string };
  set: { status?: number | string };
}) {
  if (!body.token || body.token.trim().length === 0) {
    return handleOwnerValidationError(set, "Token bot Telegram wajib diisi.", "token");
  }

  const result = await verifyTelegramBotToken(body.token);
  if (!result.success) {
    set.status = 400;
    return {
      status: "error",
      error: "INVALID_TELEGRAM_TOKEN",
      message: result.error || "Token bot Telegram tidak valid.",
    };
  }

  return successResponse(result, "Token bot Telegram berhasil diverifikasi.");
}

/**
 * Controller for POST /api/bot/otp/send
 */
export async function sendOtpController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: {
    phone: string;
    channel?: "whatsapp" | "telegram";
  };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  if (!body.phone || body.phone.trim().length === 0) {
    return handleOwnerValidationError(set, "Nomor telepon wajib diisi.", "phone");
  }

  const result = await runOwnerTx(async (tx) => {
    return await sendOtp(tx, {
      ownerId: owner.id,
      phone: body.phone,
      channel: body.channel || "whatsapp",
    });
  });

  return successResponse(result, "Kode OTP berhasil dikirim.");
}

/**
 * Controller for POST /api/bot/otp/verify
 */
export async function verifyOtpController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: {
    phone: string;
    code: string;
  };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  if (!body.phone || body.phone.trim().length === 0) {
    return handleOwnerValidationError(set, "Nomor telepon wajib diisi.", "phone");
  }

  if (!body.code || body.code.trim().length !== 6) {
    return handleOwnerValidationError(set, "Kode OTP harus berupa 6 digit angka.", "code");
  }

  const result = await runOwnerTx(async (tx) => {
    return await verifyOtp(tx, {
      ownerId: owner.id,
      phone: body.phone,
      code: body.code,
    });
  });

  if (!result.success) {
    set.status = 400;
    return {
      status: "error",
      error: "INVALID_OTP",
      message: result.error || "Kode OTP tidak valid atau sudah kedaluwarsa.",
    };
  }

  return successResponse({ verified: true }, "Nomor telepon berhasil diverifikasi.");
}
