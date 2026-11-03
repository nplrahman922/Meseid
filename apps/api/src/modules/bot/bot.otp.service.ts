import { Tx } from "../../db/client";
import { hashOtpCode } from "../../lib/crypto";
import { env } from "../../config/env";
import { createModuleLogger } from "../../logs/logger";

const botOtpLogger = createModuleLogger("bot-otp");

export interface SendOtpOptions {
  ownerId: string;
  phone: string;
  channel?: "whatsapp" | "telegram";
}

export interface VerifyOtpOptions {
  ownerId: string;
  phone: string;
  code: string;
}

/**
 * Normalizes phone numbers into E.164-compatible clean digits string (e.g. 6281234567890).
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith("08")) {
    cleaned = "628" + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Generates and delivers a 6-digit OTP code to the owner's phone via the Bot Gateway.
 */
export async function sendOtp(
  tx: Tx,
  options: SendOtpOptions
): Promise<{ success: boolean; targetPhone: string; channel: string; devCode?: string }> {
  const normPhone = normalizePhoneNumber(options.phone);
  const channel = options.channel || "whatsapp";

  // Generate 6-digit numeric OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = hashOtpCode(code);

  // Invalidate any previously active unused link codes for this owner and target
  await tx`
    UPDATE channel_link_codes
    SET used_at = now()
    WHERE owner_id = ${options.ownerId}::uuid
      AND target_external_id = ${normPhone}
      AND used_at IS NULL;
  `;

  // Insert newly generated link code (valid for 5 minutes)
  await tx`
    INSERT INTO channel_link_codes (
      owner_id,
      channel,
      target_external_id,
      code_hash,
      expires_at
    )
    VALUES (
      ${options.ownerId}::uuid,
      ${channel},
      ${normPhone},
      ${codeHash},
      now() + interval '5 minutes'
    );
  `;

  botOtpLogger.info(`Generated OTP for ${normPhone} via ${channel}`);

  // Send message via Bot Gateway
  const message = `Halo! Kode verifikasi (OTP) Meseid Anda adalah:\n\n*${code}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.`;

  let botDelivered = false;
  try {
    const res = await fetch(`${env.BOT_INTERNAL_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        channel,
        recipient_id: normPhone,
        message,
      }),
    });

    if (res.ok) {
      botDelivered = true;
      botOtpLogger.info(`OTP successfully dispatched through Bot Gateway to ${normPhone}`);
    } else {
      const errText = await res.text();
      botOtpLogger.warn(`Bot Gateway returned ${res.status}: ${errText}`);
    }
  } catch (err: any) {
    botOtpLogger.warn(`Failed to connect to Bot Gateway at ${env.BOT_INTERNAL_URL}: ${err.message}`);
  }

  return {
    success: true,
    targetPhone: normPhone,
    channel,
    // In test or non-production environment, return the code for automated testing
    devCode: env.NODE_ENV !== "production" ? code : undefined,
  };
}

/**
 * Validates a 6-digit OTP code against channel_link_codes and binds phone to owner.
 */
export async function verifyOtp(
  tx: Tx,
  options: VerifyOtpOptions
): Promise<{ success: boolean; error?: string }> {
  const normPhone = normalizePhoneNumber(options.phone);
  const codeHash = hashOtpCode(options.code.trim());

  const [row] = await tx<{ id: string; owner_id: string }[]>`
    SELECT id, owner_id
    FROM channel_link_codes
    WHERE owner_id = ${options.ownerId}::uuid
      AND target_external_id = ${normPhone}
      AND code_hash = ${codeHash}
      AND used_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  if (!row) {
    botOtpLogger.warn(`Invalid or expired OTP attempt for ${normPhone}`);
    return {
      success: false,
      error: "Kode OTP tidak valid atau sudah kedaluwarsa.",
    };
  }

  // Mark code as used
  await tx`
    UPDATE channel_link_codes
    SET used_at = now()
    WHERE id = ${row.id}::uuid;
  `;

  // Update owner phone
  await tx`
    UPDATE owners
    SET phone = ${normPhone},
        updated_at = now()
    WHERE id = ${options.ownerId}::uuid;
  `;

  botOtpLogger.info(`OTP verified successfully. Phone ${normPhone} linked to owner ${options.ownerId}`);

  return { success: true };
}
