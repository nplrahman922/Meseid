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

  // 1. Temukan session_ref aktif milik owner untuk channel ini
  const [connection] = await tx<{ session_ref: string | null; status: string }[]>`
    SELECT session_ref, status FROM channel_connections
    WHERE owner_id = ${options.ownerId}::uuid
      AND channel = ${channel}
    LIMIT 1;
  `;

  const sessionId = connection?.session_ref || `owner_${options.ownerId.replace(/-/g, "_")}`;

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

  botOtpLogger.info(`Generated OTP for ${normPhone} via ${channel} (session: ${sessionId})`);

  // Send message via Bot Gateway
  const message = `Halo! Kode verifikasi (OTP) Meseid Anda adalah:\n\n*${code}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.`;

  let botDelivered = false;
  let deliveryError: string | undefined;

  try {
    const res = await fetch(`${env.BOT_INTERNAL_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        channel,
        session_id: sessionId,
        bot_id: sessionId,
        recipient_id: normPhone,
        message,
      }),
    });

    if (res.ok) {
      botDelivered = true;
      botOtpLogger.info(`OTP successfully dispatched through Bot Gateway to ${normPhone}`);
    } else {
      const errText = await res.text();
      deliveryError = errText;
      botOtpLogger.warn(`Bot Gateway returned ${res.status}: ${errText}`);
    }
  } catch (err: any) {
    deliveryError = err.message;
    botOtpLogger.warn(`Failed to connect to Bot Gateway at ${env.BOT_INTERNAL_URL}: ${err.message}`);
  }

  // Jika bot pengirim belum aktif atau gagal mengirim di environment produksi, beri tahu pengguna secara jujur
  if (!botDelivered && env.NODE_ENV === "production") {
    return {
      success: false,
      targetPhone: normPhone,
      channel,
      error: connection?.status !== "connected"
        ? "Bot WhatsApp toko Anda belum terhubung. Silakan lakukan scan QR terlebih dahulu sebelum meminta kode OTP."
        : `Gagal mengirimkan kode OTP ke WhatsApp: ${deliveryError || "Bot tidak merespons"}`,
    } as any;
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

  // Query existing phone for security alert detection
  const [currentOwner] = await tx<{ phone: string | null }[]>`
    SELECT phone FROM owners WHERE id = ${options.ownerId}::uuid;
  `;
  const oldPhone = currentOwner?.phone;

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

  // Sinkronisasi hak akses ke channel_access_rules agar nomor owner langsung diakui sebagai 'assistant'
  await tx`
    INSERT INTO channel_access_rules (
      owner_id,
      channel,
      target_type,
      target_id,
      target_name,
      custom_label,
      status,
      persona_mode,
      trigger_mode,
      behavior_summary
    )
    VALUES (
      ${options.ownerId}::uuid,
      'whatsapp',
      'number',
      ${normPhone},
      'Owner / Pemilik',
      'Owner / Pemilik',
      'active',
      'assistant',
      'mention_or_reply',
      'Nomor telepon terverifikasi milik pemilik toko (Akses Asisten Bisnis & Keuangan).'
    )
    ON CONFLICT (owner_id, channel, target_id)
    DO UPDATE SET
      persona_mode = 'assistant',
      custom_label = 'Owner / Pemilik',
      status = 'active',
      updated_at = now();
  `;

  // Sinkronisasi allowed_contacts di bot_configs
  await tx`
    UPDATE bot_configs
    SET allowed_contacts = (
      SELECT jsonb_agg(DISTINCT elem)
      FROM jsonb_array_elements_text(
        COALESCE(allowed_contacts, '[]'::jsonb) || jsonb_build_array(${normPhone}::text)
      ) elem
    ),
    updated_at = now()
    WHERE owner_id = ${options.ownerId}::uuid;
  `;

  botOtpLogger.info(`OTP verified successfully. Phone ${normPhone} linked to owner ${options.ownerId}`);

  // Dispatch security alert to old phone if this is a phone number change
  if (oldPhone && oldPhone !== normPhone) {
    const alertMsg = `⚠️ Pemberitahuan Keamanan Meseid ID:\n\nNomor kontak owner bisnis Anda telah diperbarui ke nomor baru (+${normPhone}). Jika ini bukan Anda, segera amankan akun Anda di dashboard.`;
    fetch(`${env.BOT_INTERNAL_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        channel: "whatsapp",
        recipient_id: oldPhone,
        message: alertMsg,
      }),
    }).catch((err) => {
      botOtpLogger.warn(`Failed to dispatch security alert to old phone ${oldPhone}: ${err.message}`);
    });
  }

  return { success: true };
}
