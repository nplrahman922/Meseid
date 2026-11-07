import { Tx } from "../../../db/client";
import { hashOtpCode } from "../../../lib/crypto";
import { createModuleLogger } from "../../../logs/logger";

const botOtpLogger = createModuleLogger("telegram-otp-gen");

export interface GenerateTelegramOtpResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Operasi pembuatan kode 6-digit OTP Telegram saat pengguna mengirim /otp ke bot.
 */
export async function generateTelegramOtp(
  tx: Tx,
  botId: string,
  chatId: string
): Promise<GenerateTelegramOtpResult> {
  // 1. Temukan owner yang memiliki bot Telegram ini
  const cleanBotId = botId.trim();
  const [connection] = await tx<{ owner_id: string }[]>`
    SELECT owner_id
    FROM channel_connections
    WHERE channel = 'telegram'
      AND (
        external_account_id = ${cleanBotId}
        OR external_account_id LIKE ${cleanBotId + ':%'}
        OR external_account_id LIKE ${'%:' + cleanBotId}
      )
      AND status = 'connected'
    LIMIT 1;
  `;

  if (!connection) {
    botOtpLogger.warn(`Bot ID ${cleanBotId} belum terhubung di channel_connections (fail-closed)`);
    return {
      success: false,
      error: "Bot Telegram belum terhubung ke toko Anda di Meseid. Silakan tautkan token bot di dashboard terlebih dahulu.",
    };
  }

  // 2. Generate 6 digit angka acak
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = hashOtpCode(code);

  // 3. Batalkan kode OTP lama yang belum terpakai untuk owner dan target ini
  await tx`
    UPDATE channel_link_codes
    SET used_at = now()
    WHERE owner_id = ${connection.owner_id}::uuid
      AND channel = 'telegram'
      AND target_external_id = ${chatId}
      AND used_at IS NULL;
  `;

  // 4. Masukkan kode OTP baru (berlaku 5 menit)
  await tx`
    INSERT INTO channel_link_codes (
      owner_id,
      channel,
      target_external_id,
      code_hash,
      expires_at
    )
    VALUES (
      ${connection.owner_id}::uuid,
      'telegram',
      ${chatId},
      ${codeHash},
      now() + interval '5 minutes'
    );
  `;

  botOtpLogger.info(`Generated Telegram OTP for chatId ${chatId} (owner: ${connection.owner_id})`);

  return {
    success: true,
    code,
  };
}
