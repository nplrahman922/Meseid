import { Tx } from "../../../db/client";
import { disconnectWhatsappSession } from "../bot.gateway.client";
import { createModuleLogger } from "../../../logs/logger";

const logger = createModuleLogger("disconnect-whatsapp");

export interface DisconnectWhatsappResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Action to disconnect WhatsApp bot for the authenticated owner,
 * stopping the Baileys session and marking status in DB as disconnected.
 */
export async function disconnectWhatsappAction(
  tx: Tx,
  ownerId: string
): Promise<DisconnectWhatsappResult> {
  const sessionId = `owner_${ownerId.replace(/-/g, "_")}`;

  // 1. Mark status as disconnected in channel_connections
  await tx`
    UPDATE channel_connections
    SET status = 'disconnected',
        updated_at = now()
    WHERE owner_id = ${ownerId}::uuid
      AND channel = 'whatsapp';
  `;

  // 2. Instruct Bot Gateway to stop and purge the active session
  try {
    await disconnectWhatsappSession(sessionId);
    logger.info(`Sesi WhatsApp '${sessionId}' berhasil diputuskan untuk owner ${ownerId}`);
  } catch (err: any) {
    logger.warn(`Peringatan saat memutuskan sesi WhatsApp di Bot Gateway: ${err.message}`);
  }

  return {
    success: true,
    message: "Koneksi WhatsApp berhasil diputuskan.",
  };
}
