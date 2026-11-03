import { Tx } from "../../../../db/client";
import { successResponse, handleOwnerValidationError } from "../../../../logs";
import { createKnowledgeBase } from "../actions/create-kb.action";

/**
 * Controller untuk POST /api/owner/kb
 */
export async function createKnowledgeBaseController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: {
    category: string;
    title: string;
    content: string;
    is_internal?: boolean;
  };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  if (!body.title || body.title.trim().length === 0) {
    return handleOwnerValidationError(set, "Judul artikel tidak boleh kosong.", "title");
  }
  if (!body.content || body.content.trim().length === 0) {
    return handleOwnerValidationError(set, "Konten artikel tidak boleh kosong.", "content");
  }

  const created = await runOwnerTx(async (tx) => {
    return await createKnowledgeBase(tx, owner.id, {
      category: body.category || "faq",
      title: body.title,
      content: body.content,
      is_internal: body.is_internal ?? false,
    });
  });

  set.status = 201;
  return successResponse({ item: created }, "Artikel knowledge base berhasil ditambahkan.");
}
