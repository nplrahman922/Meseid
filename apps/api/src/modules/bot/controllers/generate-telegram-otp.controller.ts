import type { Context } from "elysia";
import { env } from "../../../config/env";
import { adminSql } from "../../../db/client";
import { generateTelegramOtp } from "../actions/generate-telegram-otp.action";

/**
 * Controller untuk POST /api/internal/telegram/generate-otp
 * Dipanggil secara internal oleh service bot Telegram saat user mengetik /otp.
 */
export async function generateTelegramOtpController(
  ctx: Context<{
    body: { bot_id: string; chat_id: string };
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

  const { bot_id, chat_id } = ctx.body || {};
  if (!bot_id || !chat_id) {
    ctx.set.status = 400;
    return {
      status: "error",
      error: "bot_id dan chat_id wajib disertakan.",
    };
  }

  const result = await adminSql.begin(async (tx) => {
    return await generateTelegramOtp(tx, bot_id, chat_id);
  });

  if (!result.success) {
    ctx.set.status = 404;
    return {
      status: "error",
      error: result.error || "Gagal membuat OTP Telegram.",
    };
  }

  return {
    status: "ok",
    code: result.code,
  };
}
