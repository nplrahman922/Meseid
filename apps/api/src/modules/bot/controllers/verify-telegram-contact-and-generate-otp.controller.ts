import type { Context } from "elysia";
import { env } from "../../../config/env";
import { adminSql } from "../../../db/client";
import { verifyTelegramContactAndGenerateOtp } from "../actions/verify-telegram-contact-and-generate-otp.action";

/**
 * Controller untuk POST /api/internal/telegram/verify-and-generate-otp
 * Memvalidasi nomor kontak asli Telegram sebelum menerbitkan 6-digit OTP.
 */
export async function verifyTelegramContactAndGenerateOtpController(
  ctx: Context<{
    body: {
      bot_id: string;
      chat_id: string;
      phone_number: string;
    };
    headers: { "x-internal-secret"?: string };
  }>
) {
  const secretHeader = ctx.headers["x-internal-secret"];
  if (!secretHeader || secretHeader !== env.INTERNAL_API_SECRET) {
    ctx.set.status = 401;
    return {
      status: "error",
      error: "Unauthorized internal service",
    };
  }

  const { bot_id, chat_id, phone_number } = ctx.body || {};
  if (!bot_id || !chat_id || !phone_number) {
    ctx.set.status = 400;
    return {
      status: "error",
      error: "bot_id, chat_id, dan phone_number wajib disertakan.",
    };
  }

  const result = await adminSql.begin(async (tx) => {
    return await verifyTelegramContactAndGenerateOtp(
      tx,
      bot_id,
      chat_id,
      phone_number
    );
  });

  if (!result.success) {
    ctx.set.status = 403;
    return {
      status: "error",
      error: result.error,
      reason: result.reason,
    };
  }

  return {
    status: "ok",
    data: {
      success: true,
      code: result.code,
    },
  };
}
