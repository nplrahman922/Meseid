import { Tx } from "../../../../db/client";
import { getWhatsappStatus } from "../../../bot/bot.gateway.client";

export interface KanalStatusResult {
  businessName: string;
  whatsapp: {
    status: "connected" | "disconnected" | "connecting" | "qr_ready" | "conflict";
    phoneNumber: string | null;
    qr: string | null;
    conflictReason?: string | null;
  };
  telegram: {
    status: "connected" | "disconnected";
    botId: string | null;
    botUsername: string | null;
    tokenMasked: string | null;
  };
  ownerPhone: string | null;
  ownerPhoneVerified: boolean;
}

/**
 * Aggregates live connection statuses for WhatsApp and Telegram,
 * along with owner personal contact verification status for the Kanal dashboard.
 */
export async function getKanalStatusAction(
  tx: Tx,
  ownerId: string
): Promise<KanalStatusResult> {
  // 1. Fetch owner record
  const ownerRows = await tx<{ business_name: string; phone: string | null }[]>`
    SELECT business_name, phone
    FROM owners
    WHERE id = ${ownerId}::uuid
    LIMIT 1;
  `;
  const businessName = ownerRows[0]?.business_name || "Bisnis Saya";
  const ownerPhone = ownerRows[0]?.phone || null;

  // 2. Fetch channel connections
  const connections = await tx<{
    channel: string;
    external_account_id: string;
    status: string;
    session_ref: string | null;
  }[]>`
    SELECT channel, external_account_id, status, session_ref
    FROM channel_connections
    WHERE owner_id = ${ownerId}::uuid;
  `;

  const waConn = connections.find((c) => c.channel === "whatsapp");
  const tgConn = connections.find((c) => c.channel === "telegram");

  // 3. Query real-time WhatsApp status from Bot Gateway
  const defaultWaSessionId = `owner_${ownerId.replace(/-/g, "_")}`;
  const targetWaSession = waConn?.session_ref || defaultWaSessionId;
  const liveWa = await getWhatsappStatus(targetWaSession);

  let waStatus: "connected" | "disconnected" | "connecting" | "qr_ready" | "conflict" = "disconnected";
  if (liveWa.status === "open") {
    waStatus = "connected";
  } else if (liveWa.status === "conflict") {
    waStatus = "conflict";
  } else if (liveWa.status === "qr_ready") {
    waStatus = "qr_ready";
  } else if (liveWa.status === "connecting") {
    waStatus = "connecting";
  } else if (liveWa.status === "logged_out" || liveWa.status === "close") {
    waStatus = "disconnected";
    // Self-healing: jika live status gateway menyatakan sesi sudah mati/logged out
    // namun status database masih 'connected', segera sinkronkan DB menjadi 'disconnected'
    if (waConn && waConn.status === "connected") {
      await tx`
        UPDATE channel_connections
        SET status = 'disconnected', updated_at = now()
        WHERE owner_id = ${ownerId}::uuid
          AND channel = 'whatsapp';
      `;
    }
  } else if (waConn && waConn.status === "connected") {
    waStatus = "connected";
  }

  // 4. Resolve Telegram connection details
  let tgStatus: "connected" | "disconnected" = "disconnected";
  let tgBotId: string | null = null;
  let tgBotUsername: string | null = null;
  let tgTokenMasked: string | null = null;

  if (tgConn && tgConn.status === "connected" && tgConn.external_account_id) {
    tgStatus = "connected";
    const rawToken = tgConn.external_account_id;
    if (rawToken.includes(":")) {
      const parts = rawToken.split(":");
      tgBotId = parts[0];
      tgTokenMasked = `${parts[0]}:${parts[1].slice(0, 4)}••••••••••••••••••••`;
    } else {
      tgTokenMasked = "••••••••••••••••••••";
    }

    if (tgConn.session_ref?.startsWith("session_tg_")) {
      tgBotId = tgConn.session_ref.replace("session_tg_", "");
    }

    if (rawToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${rawToken}/getMe`, {
          signal: AbortSignal.timeout(1500),
        });
        const tgData = (await res.json()) as any;
        if (tgData?.ok && tgData?.result?.username) {
          tgBotUsername = `@${tgData.result.username}`;
        }
      } catch {
        // Abaikan jika timeout atau offline
      }
    }
  }

  return {
    businessName,
    whatsapp: {
      status: waStatus,
      phoneNumber: liveWa.phoneNumber || waConn?.external_account_id || null,
      qr: liveWa.qr,
      conflictReason: liveWa.conflictReason,
    },
    telegram: {
      status: tgStatus,
      botId: tgBotId,
      botUsername: tgBotUsername,
      tokenMasked: tgTokenMasked,
    },
    ownerPhone,
    ownerPhoneVerified: Boolean(ownerPhone),
  };
}
