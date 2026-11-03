import { Tx } from "../../../../db/client";
import { KnowledgeBaseRecord, UpdateKnowledgeBaseInput } from "../kb.types";

/**
 * Operasi Update artikel Knowledge Base berdasarkan ID.
 */
export async function updateKnowledgeBase(
  tx: Tx,
  ownerId: string,
  id: string,
  item: UpdateKnowledgeBaseInput
): Promise<KnowledgeBaseRecord | null> {
  const [row] = await tx<KnowledgeBaseRecord[]>`
    UPDATE knowledge_base
    SET category = COALESCE(${item.category || null}, category),
        title = COALESCE(${item.title?.trim() || null}, title),
        content = COALESCE(${item.content?.trim() || null}, content),
        is_internal = CASE WHEN ${item.is_internal !== undefined} THEN ${item.is_internal} ELSE is_internal END,
        updated_at = now()
    WHERE owner_id = ${ownerId}::uuid AND id = ${id}::uuid
    RETURNING id, owner_id, category, title, content, is_internal, created_at, updated_at;
  `;
  return row || null;
}
