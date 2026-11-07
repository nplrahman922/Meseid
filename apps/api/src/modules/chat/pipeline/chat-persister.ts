import { withSystemContext } from "../../../db/client";
import { saveConversationMessage } from "../conversation.model";
import { createModuleLogger } from "../../../logs";
import type { AiChatExtractionResult } from "../../../adapters/ai/types";
import type { ChannelOwnerResolution } from "./owner-resolver";
import type { InboundMessageInput } from "../chat.schema";

const chatLogger = createModuleLogger("chat-persister");

export class ChatPersister {
  /**
   * Menyimpan balasan AI ke tabel conversation_messages, mencatat chat_logs analitik,
   * dan memperbarui status inbound_messages menjadi 'done'.
   */
  static async persistAssistantResponse(params: {
    owner: ChannelOwnerResolution;
    payload: InboundMessageInput;
    isOwner: boolean;
    persona: "assistant" | "admin";
    finalReply: string;
    aiResult: AiChatExtractionResult;
  }): Promise<void> {
    const { owner, payload, isOwner, persona, finalReply, aiResult } = params;

    const isGroup = payload.chat_type === "group" || payload.chat_id?.endsWith("@g.us");
    const threadId = isGroup ? payload.chat_id : payload.sender_id;

    await withSystemContext(async (tx) => {
      await saveConversationMessage(tx, {
        ownerId: owner.owner_id,
        channel: payload.channel,
        senderId: threadId,
        isOwner,
        persona,
        role: "assistant",
        content: finalReply,
      });

      await tx`
        INSERT INTO chat_logs (
          owner_id, channel, external_sender_id, summary, intent, sentiment
        )
        VALUES (
          ${owner.owner_id},
          ${payload.channel},
          ${payload.sender_id},
          ${aiResult.summary || "Percakapan pesan bot"},
          ${aiResult.intent || "general"},
          ${aiResult.sentiment || "neutral"}
        );
      `;

      await tx`
        UPDATE inbound_messages
        SET status = 'done',
            updated_at = now()
        WHERE channel = ${payload.channel} AND external_message_id = ${payload.external_message_id};
      `;
    });
  }

  /**
   * Menandai pesan inbound sebagai 'failed' jika terjadi kendala saat pemrosesan.
   */
  static async markInboundFailed(payload: InboundMessageInput, errorReason?: string): Promise<void> {
    chatLogger.warn(`Menandai inbound message ${payload.external_message_id} sebagai failed: ${errorReason || "unknown"}`);
    await withSystemContext(async (tx) => {
      await tx`
        UPDATE inbound_messages
        SET status = 'failed',
            updated_at = now()
        WHERE channel = ${payload.channel} AND external_message_id = ${payload.external_message_id};
      `;
    });
  }
}
