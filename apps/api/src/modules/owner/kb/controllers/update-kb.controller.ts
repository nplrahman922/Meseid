import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { updateKnowledgeBase } from "../actions/update-kb.action";

/**
 * Controller untuk PUT /api/owner/kb/:id
 */
export async function updateKnowledgeBaseController({
  params,
  body,
  owner,
  runOwnerTx,
  set,
}: {
  params: { id: string };
  body: {
    category?: string;
    title?: string;
    content?: string;
    is_internal?: boolean;
  };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  const updated = await runOwnerTx(async (tx) => {
    return await updateKnowledgeBase(tx, owner.id, params.id, body);
  });

  if (!updated) {
    set.status = 404;
    return {
      error: "NOT_FOUND",
      message: "Artikel knowledge base tidak ditemukan.",
    };
  }

  return successResponse({ item: updated }, "Artikel knowledge base berhasil diperbarui.");
}
