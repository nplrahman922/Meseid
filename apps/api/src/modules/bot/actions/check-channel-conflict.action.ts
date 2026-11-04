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

  // Cari apakah ada koneksi aktif untuk nomor ini
  const rows = await tx<
    {
      owner_id: string;
      session_ref: string | null;
      status: string;
      business_name: string;
    }[]
  >`
    SELECT 
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
      AND cc.status = 'connected'
      AND o.status = 'active'
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return { isConflict: false };
  }

  const existing = rows[0];

  // Jika owner ID sama, bukan konflik (pemilik sedang re-scan atau reconnect bot-nya sendiri)
  if (currentOwnerId && existing.owner_id === currentOwnerId) {
    return { isConflict: false };
  }

  // Jika session_ref sama persis, bukan konflik (sesi yang sama sedang refresh)
  if (sessionId && existing.session_ref === sessionId) {
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
