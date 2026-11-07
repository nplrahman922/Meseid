import { Tx } from "../../../db/client";
import { stopTelegramBot } from "../bot.gateway.client";
import { createModuleLogger } from "../../../logs/logger";

const logger = createModuleLogger("disconnect-telegram");

export interface DisconnectTelegramResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Action to disconnect Telegram bot for the authenticated owner,
 * stopping the Grammy bot instance and updating status in DB to disconnected.
 */
export async function disconnectTelegramAction(
  tx: Tx,
  ownerId: string
): Promise<DisconnectTelegramResult> {
  // 1. Get existing telegram connection to extract botId if present
  const rows = await tx<{ session_ref: string | null; external_account_id: string }[]>`
    SELECT session_ref, external_account_id
    FROM channel_connections
    WHERE owner_id = ${ownerId}::uuid
      AND channel = 'telegram'
    LIMIT 1;
  `;

  // 2. Mark status as disconnected in channel_connections
  await tx`
    UPDATE channel_connections
    SET status = 'disconnected',
        updated_at = now()
    WHERE owner_id = ${ownerId}::uuid
      AND channel = 'telegram';
  `;

  // 3. Stop bot instance in Bot Gateway
  if (rows.length > 0) {
    const sessionRef = rows[0].session_ref;
    let botId = "";
    if (sessionRef && sessionRef.startsWith("session_tg_")) {
      botId = sessionRef.replace("session_tg_", "");
    } else if (rows[0].external_account_id.includes(":")) {
      botId = rows[0].external_account_id.split(":")[0];
    }

    if (botId) {
      try {
        await stopTelegramBot(botId);
        logger.info(`Bot Telegram ID ${botId} berhasil dihentikan untuk owner ${ownerId}`);
      } catch (err: any) {
        logger.warn(`Peringatan saat menghentikan bot Telegram di Bot Gateway: ${err.message}`);
      }
    }
  }

  return {
    success: true,
    message: "Koneksi Telegram berhasil diputuskan.",
  };
}
