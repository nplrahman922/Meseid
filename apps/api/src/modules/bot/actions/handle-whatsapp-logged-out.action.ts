import { Tx } from "../../../db/client";
import { createModuleLogger } from "../../../logs/logger";

const logger = createModuleLogger("handle-whatsapp-logged-out");

export interface HandleWhatsAppLoggedOutResult {
  success: boolean;
  ownerId?: string;
  affectedRows: number;
}

/**
 * Action untuk menangani event logout WhatsApp dari perangkat HP mobile.
 * Mengubah status koneksi WhatsApp di database PostgreSQL menjadi 'disconnected'.
 */
export async function handleWhatsAppLoggedOutAction(
  tx: Tx,
  sessionId: string,
  rawOwnerId?: string
): Promise<HandleWhatsAppLoggedOutResult> {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let resolvedOwnerId =
    rawOwnerId && uuidRegex.test(rawOwnerId) ? rawOwnerId : undefined;

  if (!resolvedOwnerId && sessionId.startsWith("owner_")) {
    const candidate = sessionId.replace(/^owner_/, "").replace(/_/g, "-");
    if (uuidRegex.test(candidate)) {
      resolvedOwnerId = candidate;
    }
  }

  let updatedRows: { id: string }[] = [];

  if (resolvedOwnerId) {
    updatedRows = await tx<{ id: string }[]>`
      UPDATE channel_connections
      SET status = 'disconnected',
          updated_at = now()
      WHERE owner_id = ${resolvedOwnerId}::uuid
        AND channel = 'whatsapp'
      RETURNING id;
    `;
  } else {
    updatedRows = await tx<{ id: string }[]>`
      UPDATE channel_connections
      SET status = 'disconnected',
          updated_at = now()
      WHERE session_ref = ${sessionId}
        AND channel = 'whatsapp'
      RETURNING id;
    `;
  }

  logger.info(
    `Sesi WhatsApp '${sessionId}' logout permanen dari HP. Status di DB berhasil diubah menjadi 'disconnected' (${updatedRows.length} baris terpengaruh).`
  );

  return {
    success: true,
    ownerId: resolvedOwnerId,
    affectedRows: updatedRows.length,
  };
}
