import { Tx } from "../../../../db/client";
import { successResponse, handleOwnerValidationError } from "../../../../logs";
import { CreateKnowledgeBaseInput } from "../kb.types";
import { batchInsertKnowledgeBase } from "../actions/batch-insert-kb.action";

/**
 * Controller untuk POST /api/owner/kb/batch
 */
export async function batchCreateKnowledgeBaseController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: {
    items: CreateKnowledgeBaseInput[];
  };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return handleOwnerValidationError(set, "Daftar item tidak boleh kosong.", "items");
  }

  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    if (!item.title?.trim() || !item.content?.trim()) {
      return handleOwnerValidationError(
        set,
        `Item ke-${i + 1} harus memiliki judul dan konten yang valid.`,
        `items[${i}]`
      );
    }
  }

  const createdItems = await runOwnerTx(async (tx) => {
    return await batchInsertKnowledgeBase(tx, owner.id, body.items);
  });

  set.status = 201;
  return successResponse(
    { items: createdItems, count: createdItems.length },
    "Batch knowledge base berhasil disimpan."
  );
}
