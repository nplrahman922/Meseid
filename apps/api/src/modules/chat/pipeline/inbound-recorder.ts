import crypto from "node:crypto";
import { withSystemContext } from "../../../db/client";
import { createModuleLogger } from "../../../logs";
import type { InboundMessageInput } from "../chat.schema";

const chatLogger = createModuleLogger("chat-inbound-recorder");

export class InboundRecorder {
  /**
   * Menghitung hash payload untuk deteksi perubahan konten atau duplikasi.
   */
  static hashPayload(payload: InboundMessageInput): string {
    const content = `${payload.channel}:${payload.external_message_id}:${payload.sender_id}:${payload.text || ""}`;
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Menangani idempotency pesan masuk di tabel inbound_messages:
   * - Jika pesan sudah 'done' atau 'processing' -> abaikan (ignored).
   * - Jika pesan pernah 'failed' -> boleh diproses ulang (update ke 'processing').
   * - Jika pesan baru -> catat dengan status 'processing'.
   */
  static async recordOrCheckInboundMessage(
    payload: InboundMessageInput,
    ownerId?: string | null
  ): Promise<{ shouldProcess: boolean; reason?: string }> {
    const payloadHash = this.hashPayload(payload);

    return withSystemContext(async (tx) => {
      const existing = await tx<{ id: string; status: string }[]>`
        SELECT id, status FROM inbound_messages
        WHERE channel = ${payload.channel} AND external_message_id = ${payload.external_message_id}
        LIMIT 1;
      `;

      if (existing.length > 0) {
        const msg = existing[0];
        if (msg.status === "done" || msg.status === "processing") {
          chatLogger.info(
            `Pesan duplikat diabaikan (status saat ini: ${msg.status})`,
            { channel: payload.channel, externalMessageId: payload.external_message_id }
          );
          return { shouldProcess: false, reason: `already_${msg.status}` };
        }

        if (msg.status === "failed") {
          chatLogger.info(
            `Pesan gagal sebelumnya diproses ulang (retry)`,
            { channel: payload.channel, externalMessageId: payload.external_message_id }
          );
          await tx`
            UPDATE inbound_messages
            SET status = 'processing',
                payload_hash = ${payloadHash},
                updated_at = now()
            WHERE id = ${msg.id};
          `;
          return { shouldProcess: true };
        }
      }

      await tx`
        INSERT INTO inbound_messages (
          channel, external_message_id, owner_id, sender_id, payload_hash, status
        )
        VALUES (
          ${payload.channel},
          ${payload.external_message_id},
          ${ownerId || null},
          ${payload.sender_id},
          ${payloadHash},
          'processing'
        )
        ON CONFLICT (channel, external_message_id)
        DO UPDATE SET status = 'processing', payload_hash = EXCLUDED.payload_hash, updated_at = now();
      `;

      return { shouldProcess: true };
    });
  }

  /**
   * Mengikat owner_id ke pesan inbound setelah owner berhasil diidentifikasi.
   */
  static async bindOwner(
    payload: InboundMessageInput,
    ownerId: string
  ): Promise<void> {
    await withSystemContext(async (tx) => {
      await tx`
        UPDATE inbound_messages
        SET owner_id = ${ownerId}
        WHERE channel = ${payload.channel} AND external_message_id = ${payload.external_message_id};
      `;
    });
  }
}
