import { Tx } from "../../../../db/client";

/**
 * Operasi Delete artikel Knowledge Base berdasarkan ID.
 */
export async function deleteKnowledgeBase(
  tx: Tx,
  ownerId: string,
  id: string
): Promise<boolean> {
  const result = await tx`
    DELETE FROM knowledge_base
    WHERE owner_id = ${ownerId}::uuid AND id = ${id}::uuid;
  `;
  return result.count > 0;
}
