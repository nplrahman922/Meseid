import { Tx } from "../../../../db/client";
import { KnowledgeBaseRecord } from "../kb.types";

/**
 * Operasi Search artikel Knowledge Base menggunakan ILIKE text match.
 * Jika onlyPublic true, menyaring is_internal = false.
 */
export async function searchKnowledgeBase(
  tx: Tx,
  ownerId: string,
  query: string,
  onlyPublic: boolean = false
): Promise<KnowledgeBaseRecord[]> {
  const q = `%${query.trim()}%`;
  return await tx<KnowledgeBaseRecord[]>`
    SELECT id, owner_id, category, title, content, is_internal, created_at, updated_at
    FROM knowledge_base
    WHERE owner_id = ${ownerId}::uuid
      AND (${onlyPublic ? tx`is_internal = false` : tx`true`})
      AND (title ILIKE ${q} OR content ILIKE ${q} OR category ILIKE ${q})
    ORDER BY updated_at DESC
    LIMIT 20;
  `;
}
