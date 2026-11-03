import { Tx } from "../../../../db/client";
import { KnowledgeBaseRecord } from "../kb.types";

/**
 * Operasi Read/Get single Knowledge Base artikel berdasarkan ID.
 */
export async function getKnowledgeBaseById(
  tx: Tx,
  ownerId: string,
  id: string
): Promise<KnowledgeBaseRecord | null> {
  const [row] = await tx<KnowledgeBaseRecord[]>`
    SELECT id, owner_id, category, title, content, is_internal, created_at, updated_at
    FROM knowledge_base
    WHERE owner_id = ${ownerId}::uuid AND id = ${id}::uuid;
  `;
  return row || null;
}
