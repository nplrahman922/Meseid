import { Tx } from "../../../db/client";
import { hashOtpCode } from "../../../lib/crypto";
import { createModuleLogger } from "../../../logs/logger";

const botOtpLogger = createModuleLogger("telegram-otp");

export interface VerifyTelegramOtpResult {
  success: boolean;
  error?: string;
  chatId?: string;
}

/**
 * Operasi verifikasi kode OTP Telegram (Inverted OTP) dan binding chat_id ke Owner.
 */
export async function verifyTelegramOtp(
  tx: Tx,
  ownerId: string,
  code: string
): Promise<VerifyTelegramOtpResult> {
  const cleanCode = code.trim();
  if (cleanCode.length !== 6 || isNaN(Number(cleanCode))) {
    return {
      success: false,
      error: "Kode OTP harus berupa 6 digit angka.",
    };
  }

  const codeHash = hashOtpCode(cleanCode);

  const [row] = await tx<{ id: string; target_external_id: string }[]>`
    SELECT id, target_external_id
    FROM channel_link_codes
    WHERE owner_id = ${ownerId}::uuid
      AND channel = 'telegram'
      AND code_hash = ${codeHash}
      AND used_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  if (!row) {
    botOtpLogger.warn(`Invalid or expired Telegram OTP attempt for owner ${ownerId}`);
    return {
      success: false,
      error: "Kode OTP Telegram salah atau sudah kedaluwarsa. Silakan kirim /otp kembali di bot Telegram.",
    };
  }

  // 1. Tandai kode OTP telah digunakan
  await tx`
    UPDATE channel_link_codes
    SET used_at = now()
    WHERE id = ${row.id}::uuid;
  `;

  // 2. Ikat Telegram chat_id ke allowed_contacts di bot_configs
  await tx`
    UPDATE bot_configs
    SET allowed_contacts = (
      SELECT jsonb_agg(DISTINCT elem)
      FROM jsonb_array_elements_text(COALESCE(allowed_contacts, '[]'::jsonb) || jsonb_build_array(${row.target_external_id}::text)) elem
    ),
    updated_at = now()
    WHERE owner_id = ${ownerId}::uuid;
  `;

  botOtpLogger.info(`Telegram chat_id ${row.target_external_id} successfully linked to owner ${ownerId}`);

  return {
    success: true,
    chatId: row.target_external_id,
  };
}
