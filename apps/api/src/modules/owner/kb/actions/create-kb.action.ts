import { Tx } from "../../../../db/client";
import { CreateKnowledgeBaseInput, KnowledgeBaseRecord } from "../kb.types";

/**
 * Operasi Create single Knowledge Base artikel baru.
 */
export async function createKnowledgeBase(
  tx: Tx,
  ownerId: string,
  item: CreateKnowledgeBaseInput
): Promise<KnowledgeBaseRecord> {
  const [row] = await tx<KnowledgeBaseRecord[]>`
    INSERT INTO knowledge_base (
      owner_id,
      category,
      title,
      content,
      is_internal
    )
    VALUES (
      ${ownerId}::uuid,
      ${item.category || 'faq'},
      ${item.title.trim()},
      ${item.content.trim()},
      ${item.is_internal ?? false}
    )
    RETURNING id, owner_id, category, title, content, is_internal, created_at, updated_at;
  `;
  return row;
}
