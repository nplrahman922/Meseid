import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { listKnowledgeBase } from "../actions/list-kb.action";

/**
 * Controller untuk GET /api/owner/kb
 */
export async function listKnowledgeBaseController({
  query,
  owner,
  runOwnerTx,
}: {
  query: { category?: string; is_internal?: string };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const isInternal =
    query.is_internal === "true"
      ? true
      : query.is_internal === "false"
      ? false
      : undefined;

  const items = await runOwnerTx(async (tx) => {
    return await listKnowledgeBase(tx, owner.id, {
      category: query.category,
      is_internal: isInternal,
    });
  });

  return successResponse({ items }, "Daftar knowledge base berhasil diambil.");
}
