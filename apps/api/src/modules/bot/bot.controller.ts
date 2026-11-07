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
  owner,
  runOwnerTx,
}: {
  query?: { sessionId?: string };
  owner: { id: string };
  runOwnerTx?: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  let sessionId = `owner_${owner.id.replace(/-/g, "_")}`;

  // Jika owner telah memiliki sambungan aktif di channel_connections, utamakan session_ref tersebut
  if (runOwnerTx) {
    try {
      const existing = await runOwnerTx(async (tx) => {
        return await tx<{ session_ref: string | null }[]>`
          SELECT session_ref FROM channel_connections
          WHERE owner_id = ${owner.id}::uuid
            AND channel = 'whatsapp'
            AND status = 'connected'
            AND session_ref IS NOT NULL
          LIMIT 1;
        `;
      });
      if (existing.length > 0 && existing[0].session_ref) {
        sessionId = existing[0].session_ref;
      }
    } catch {
      // Tetap gunakan sessionId berbasis owner
    }
  }

  const result = await getWhatsappStatus(sessionId);
  return successResponse({
    whatsapp: result,
  });
}

/**
 * Controller for POST /api/bot/whatsapp/reset
 */
export async function resetWhatsappSessionController({
  owner,
  runOwnerTx,
  set,
}: {
  body?: { sessionId?: string };
  owner: { id: string };
  runOwnerTx?: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  const targetSessionId = `owner_${owner.id.replace(/-/g, "_")}`;

  // Perbarui session_ref di database jika owner mereset sesi
  if (runOwnerTx) {
    try {
      await runOwnerTx(async (tx) => {
        await tx`
          UPDATE channel_connections
          SET session_ref = ${targetSessionId},
              status = 'disconnected',
              updated_at = now()
          WHERE owner_id = ${owner.id}::uuid
            AND channel = 'whatsapp';
        `;
      });
    } catch {
      // Abaikan jika belum ada row di channel_connections
    }
  }

  const result = await resetWhatsappSession(targetSessionId);
  if (!result.success) {
    set.status = 500;
    return {
      status: "error",
      error: "RESET_FAILED",
      message: result.error || "Gagal mereset sesi WhatsApp.",
    };
  }
  return successResponse(
    {
      sessionStatus: result.status || "connecting",
      sessionId: targetSessionId,
    },
    "Sesi WhatsApp berhasil direset. Silakan pindai QR Code."
  );
}

/**
 * Controller for POST /api/bot/telegram/verify
 */
export async function verifyTelegramTokenController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: { token: string };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
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

  // Ikat token Telegram lengkap & botId ke owner di channel_connections
  if (result.botId && owner?.id) {
    const cleanToken = body.token.trim();
    await runOwnerTx(async (tx) => {
      // Bersihkan entri duplikat lama (misal yang hanya nomor botId) untuk owner ini
      await tx`
        DELETE FROM channel_connections
        WHERE owner_id = ${owner.id}::uuid
          AND channel = 'telegram'
          AND external_account_id != ${cleanToken};
      `;

      await tx`
        INSERT INTO channel_connections (
          owner_id,
          channel,
          external_account_id,
          status,
          session_ref
        )
        VALUES (
          ${owner.id}::uuid,
          'telegram',
          ${cleanToken},
          'connected',
          ${`session_tg_${result.botId}`}
        )
        ON CONFLICT (channel, external_account_id)
        DO UPDATE SET
          owner_id = ${owner.id}::uuid,
          session_ref = ${`session_tg_${result.botId}`},
          status = 'connected',
          updated_at = now();
      `;
    });
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
