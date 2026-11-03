import { withSystemContext } from "../../../db/client";
import { aiAdapter } from "../../../adapters/ai";
import { saveConversationMessage, getRecentConversationHistory } from "../conversation.model";
import type { ConversationTurn } from "../../../adapters/ai/types";
import type { InboundMessageInput } from "../chat.schema";

export interface MemoryWindowResult {
  recentTurns: ConversationTurn[];
  memoryDigest?: string;
}

export class MemoryWindowReader {
  /**
   * Mengambil riwayat percakapan terkini, menyusun memory digest jika percakapan >= 3 pesan,
   * dan mencatat pesan user baru ke tabel conversation_messages.
   */
  static async processUserMemory(
    payload: InboundMessageInput,
    ownerId: string,
    isOwner: boolean,
    persona: "assistant" | "admin"
  ): Promise<MemoryWindowResult> {
    let recentTurns: ConversationTurn[] = [];
    let memoryDigest: string | undefined;
    const rawUserMessage = payload.text?.trim() || "";
    const quoted = payload.quoted_text?.trim();
    const userMessage = quoted
      ? `[Membalas pesan]: "${quoted}"\n\n[Pesan]: ${rawUserMessage}`
      : rawUserMessage;

    await withSystemContext(async (tx) => {
      const history = await getRecentConversationHistory(tx, {
        ownerId,
        channel: payload.channel,
        senderId: payload.sender_id,
        isOwner,
        limit: 30,
      });

      recentTurns = history.slice(-8).map((h) => ({
        role: h.role,
        content: h.content,
      }));

      if (history.length >= 3) {
        memoryDigest = (await aiAdapter.distillConversationContext(history)) || undefined;
      }

      await saveConversationMessage(tx, {
        ownerId,
        channel: payload.channel,
        senderId: payload.sender_id,
        isOwner,
        persona,
        role: "user",
        content: userMessage,
      });
    });

    return {
      recentTurns,
      memoryDigest,
    };
  }
}
