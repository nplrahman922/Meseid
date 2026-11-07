import { Tx } from "../../../db/client";
import { hashOtpCode } from "../../../lib/crypto";
import { createModuleLogger } from "../../../logs/logger";
import { normalizePhoneNumber } from "../bot.otp.service";

const logger = createModuleLogger("telegram-contact-otp");

export interface VerifyTelegramContactResult {
  success: boolean;
  code?: string;
  error?: string;
  reason?: "BOT_NOT_FOUND" | "OWNER_PHONE_NOT_SET" | "PHONE_MISMATCH";
}

/**
 * Memvalidasi nomor telepon dari Telegram Share Contact terhadap owners.phone
 * sebelum menerbitkan kode OTP 6-digit.
 */
export async function verifyTelegramContactAndGenerateOtp(
  tx: Tx,
  botId: string,
  chatId: string,
  contactPhone: string
): Promise<VerifyTelegramContactResult> {
  const cleanBotId = botId.trim();

  // 1. Temukan channel connection untuk bot Telegram ini
  const [connection] = await tx<{ owner_id: string }[]>`
    SELECT owner_id
    FROM channel_connections
    WHERE channel = 'telegram'
      AND (
        external_account_id = ${cleanBotId}
        OR external_account_id LIKE ${cleanBotId + ":%"}
        OR external_account_id LIKE ${"%:" + cleanBotId}
      )
      AND status = 'connected'
    LIMIT 1;
  `;

  if (!connection) {
    logger.warn(
      `Bot Telegram ${cleanBotId} belum terhubung di channel_connections (fail-closed)`
    );
    return {
      success: false,
      error:
        "Bot Telegram belum terhubung ke toko Anda di Meseid. Silakan tautkan token bot di dashboard terlebih dahulu.",
      reason: "BOT_NOT_FOUND",
    };
  }

  // 2. Ambil data nomor pemilik toko (owners.phone)
  const [owner] = await tx<{ phone: string | null }[]>`
    SELECT phone
    FROM owners
    WHERE id = ${connection.owner_id}::uuid
    LIMIT 1;
  `;

  if (!owner || !owner.phone) {
    logger.warn(
      `Owner ${connection.owner_id} belum mendaftarkan nomor telepon pribadi di profil`
    );
    return {
      success: false,
      error:
        "Nomor pribadi pemilik toko belum diatur pada profil bisnis Meseid. Silakan atur nomor telepon Anda terlebih dahulu di dashboard web.",
      reason: "OWNER_PHONE_NOT_SET",
    };
  }

  // 3. Normalisasi kedua nomor telepon dan bandingkan
  const normContact = normalizePhoneNumber(contactPhone);
  const normOwner = normalizePhoneNumber(owner.phone);

  if (normContact !== normOwner) {
    logger.warn(
      `Verifikasi kontak Telegram ditolak untuk bot ${cleanBotId}: Kontak '+${normContact}' !== Owner '+${normOwner}'`
    );
    return {
      success: false,
      error: `Nomor telepon Telegram Anda (+${normContact}) tidak cocok dengan nomor pemilik toko yang terdaftar di Meseid (+${normOwner}). Permintaan OTP ditolak demi keamanan.`,
      reason: "PHONE_MISMATCH",
    };
  }

  // 4. Nomor cocok: terbitkan 6-digit OTP baru
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = hashOtpCode(code);

  // Batalkan OTP lama yang belum terpakai untuk target chatId ini
  await tx`
    UPDATE channel_link_codes
    SET used_at = now()
    WHERE owner_id = ${connection.owner_id}::uuid
      AND channel = 'telegram'
      AND target_external_id = ${chatId}
      AND used_at IS NULL;
  `;

  // Simpan OTP baru (berlaku 5 menit)
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

  logger.info(
    `OTP berhasil diterbitkan untuk chatId ${chatId} (Owner: ${connection.owner_id}, Phone: +${normOwner})`
  );

  return {
    success: true,
    code,
  };
}
