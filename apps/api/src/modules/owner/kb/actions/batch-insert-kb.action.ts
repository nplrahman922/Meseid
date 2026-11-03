import { Tx } from "../../../../db/client";
import { CreateKnowledgeBaseInput, KnowledgeBaseRecord } from "../kb.types";

/**
 * Operasi Batch Insert untuk memasukkan banyak artikel Knowledge Base sekaligus.
 */
export async function batchInsertKnowledgeBase(
  tx: Tx,
  ownerId: string,
  items: CreateKnowledgeBaseInput[]
): Promise<KnowledgeBaseRecord[]> {
  if (items.length === 0) return [];

  const inserted: KnowledgeBaseRecord[] = [];
  for (const item of items) {
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
    inserted.push(row);
  }

  return inserted;
}
