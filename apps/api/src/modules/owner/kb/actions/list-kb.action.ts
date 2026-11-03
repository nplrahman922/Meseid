import { Tx } from "../../../../db/client";
import { KnowledgeBaseRecord } from "../kb.types";

/**
 * Operasi List Knowledge Base artikel untuk owner dengan filter opsional.
 */
export async function listKnowledgeBase(
  tx: Tx,
  ownerId: string,
  filter?: { category?: string; is_internal?: boolean }
): Promise<KnowledgeBaseRecord[]> {
  const categoryFilter = filter?.category?.trim();
  const isInternalFilter = filter?.is_internal;

  return await tx<KnowledgeBaseRecord[]>`
    SELECT id, owner_id, category, title, content, is_internal, created_at, updated_at
    FROM knowledge_base
    WHERE owner_id = ${ownerId}::uuid
      AND (${categoryFilter ? tx`category = ${categoryFilter}` : tx`true`})
      AND (${isInternalFilter !== undefined ? tx`is_internal = ${isInternalFilter}` : tx`true`})
    ORDER BY created_at ASC;
  `;
}
