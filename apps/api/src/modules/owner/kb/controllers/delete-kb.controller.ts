import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { deleteKnowledgeBase } from "../actions/delete-kb.action";

/**
 * Controller untuk DELETE /api/owner/kb/:id
 */
export async function deleteKnowledgeBaseController({
  params,
  owner,
  runOwnerTx,
  set,
}: {
  params: { id: string };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  const deleted = await runOwnerTx(async (tx) => {
    return await deleteKnowledgeBase(tx, owner.id, params.id);
  });

  if (!deleted) {
    set.status = 404;
    return {
      error: "NOT_FOUND",
      message: "Artikel knowledge base tidak ditemukan.",
    };
  }

  return successResponse(undefined, "Artikel knowledge base berhasil dihapus.");
}
