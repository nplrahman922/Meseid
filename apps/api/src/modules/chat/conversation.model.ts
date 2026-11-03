import { Tx } from "../../db/client";

export interface ConversationMessageRecord {
  id: string;
  owner_id: string;
  channel: "whatsapp" | "telegram";
  sender_id: string;
  is_owner: boolean;
  persona: "admin" | "assistant";
  role: "user" | "assistant";
  content: string;
  created_at: Date;
}

export interface SaveConversationMessageInput {
  ownerId: string;
  channel: "whatsapp" | "telegram";
  senderId: string;
  isOwner: boolean;
  persona: "admin" | "assistant";
  role: "user" | "assistant";
  content: string;
}

export interface HistoryMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: Date;
}

/**
 * Menyimpan pesan percakapan (baik dari pengguna maupun balasan bot)
 * dengan isolasi 6-lapis (owner_id, channel, sender_id, is_owner, persona).
 */
export async function saveConversationMessage(
  tx: Tx,
  input: SaveConversationMessageInput
): Promise<ConversationMessageRecord> {
  const [row] = await tx<ConversationMessageRecord[]>`
    INSERT INTO conversation_messages (
      owner_id,
      channel,
      sender_id,
      is_owner,
      persona,
      role,
      content
    ) VALUES (
      ${input.ownerId}::uuid,
      ${input.channel},
      ${input.senderId},
      ${input.isOwner},
      ${input.persona},
      ${input.role},
      ${input.content.trim()}
    )
    RETURNING id, owner_id, channel, sender_id, is_owner, persona, role, content, created_at;
  `;

  return row;
}

/**
 * Mengambil riwayat percakapan terakhir (default: 30 pesan terakhir)
 * yang terisolasi secara ketat untuk pengirim dan persona tertentu.
 * Dikembalikan dalam urutan kronologis (dari pesan terlama ke terbaru).
 */
export async function getRecentConversationHistory(
  tx: Tx,
  params: {
    ownerId: string;
    channel: "whatsapp" | "telegram";
    senderId: string;
    isOwner: boolean;
    limit?: number;
  }
): Promise<HistoryMessageItem[]> {
  const limit = params.limit ?? 30;

  const rows = await tx<HistoryMessageItem[]>`
    SELECT id, role, content, created_at
    FROM conversation_messages
    WHERE owner_id = ${params.ownerId}::uuid
      AND channel = ${params.channel}
      AND sender_id = ${params.senderId}
      AND is_owner = ${params.isOwner}
    ORDER BY seq DESC
    LIMIT ${limit};
  `;

  // Balik urutan agar kronologis dari masa lalu ke sekarang
  return rows.reverse();
}
