import { Tx } from "../../../db/client";
import { createModuleLogger } from "../../../logs/logger";

const conflictLogger = createModuleLogger("channel-conflict-checker");

export interface ChannelConflictResult {
  isConflict: boolean;
  existingOwnerId?: string;
  businessName?: string;
  reason?: string;
}

/**
 * Memeriksa apakah nomor WhatsApp atau akun channel tertentu sudah terdaftar
 * pada owner aktif lain di sistem Meseid untuk mencegah pembajakan/duplikasi sesi.
 */
export async function checkChannelConflict(
  tx: Tx,
  channel: "whatsapp" | "telegram",
  externalAccountId: string,
  sessionId?: string,
  currentOwnerId?: string
): Promise<ChannelConflictResult> {
  const cleanId = externalAccountId.trim().replace(/[^0-9]/g, "");

  if (!cleanId) {
    return { isConflict: false };
  }

  // 1. Urai owner ID dari sessionId jika belum disertakan (format: owner_<owner_id>)
  const resolvedOwnerId =
    currentOwnerId ||
    (sessionId?.startsWith("owner_")
      ? sessionId.replace(/^owner_/, "").replace(/_/g, "-")
      : undefined);

  // Cari apakah ada data koneksi untuk nomor ini
  const rows = await tx<
    {
      id: string;
      owner_id: string;
      session_ref: string | null;
      status: string;
      business_name: string;
    }[]
  >`
    SELECT 
      cc.id,
      cc.owner_id,
      cc.session_ref,
      cc.status,
      o.business_name
    FROM channel_connections cc
    JOIN owners o ON o.id = cc.owner_id
    WHERE cc.channel = ${channel}
      AND (
        cc.external_account_id = ${cleanId}
        OR cc.external_account_id = ${cleanId + '@s.whatsapp.net'}
      )
      AND o.status = 'active'
    LIMIT 1;
  `;

  if (rows.length === 0) {
    // Nomor baru belum pernah terdaftar: daftarkan langsung jika ada owner yang sah
    if (resolvedOwnerId) {
      await tx`
        INSERT INTO channel_connections (owner_id, channel, external_account_id, session_ref, status)
        VALUES (${resolvedOwnerId}::uuid, ${channel}, ${cleanId}, ${sessionId || null}, 'connected')
        ON CONFLICT (channel, external_account_id)
        DO UPDATE SET status = 'connected', session_ref = EXCLUDED.session_ref, updated_at = now();
      `;
    }
    return { isConflict: false };
  }

  const existing = rows[0];

  // 2. Jika nomor dimiliki oleh owner yang sama -> Reconnect sah dari pemilik akun
  if (resolvedOwnerId && existing.owner_id === resolvedOwnerId) {
    await tx`
      UPDATE channel_connections
      SET session_ref = COALESCE(${sessionId}, session_ref),
          status = 'connected',
          updated_at = now()
      WHERE id = ${existing.id}::uuid;
    `;
    return { isConflict: false };
  }

  // 3. Jika session_ref cocok persis dengan sesi yang terdaftar
  if (sessionId && existing.session_ref === sessionId) {
    await tx`
      UPDATE channel_connections
      SET status = 'connected',
          updated_at = now()
      WHERE id = ${existing.id}::uuid;
    `;
    return { isConflict: false };
  }

  conflictLogger.warn(
    `Konflik terdeteksi: Akun ${channel} '${cleanId}' sudah dimiliki oleh Owner ID '${existing.owner_id}' (${existing.business_name})`,
    {
      channel,
      accountId: cleanId,
      existingOwnerId: existing.owner_id,
      attemptedSessionId: sessionId,
      attemptedOwnerId: currentOwnerId,
    }
  );

  return {
    isConflict: true,
    existingOwnerId: existing.owner_id,
    businessName: existing.business_name,
    reason: `Nomor ini sudah terdaftar aktif pada bisnis '${existing.business_name}'.`,
  };
}
