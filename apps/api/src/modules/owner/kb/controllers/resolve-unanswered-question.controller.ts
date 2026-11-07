import { Tx } from "../../../../db/client";
import { successResponse, errorResponse, HTTP_STATUS } from "../../../../logs";
import { resolveUnansweredQuestionAction } from "../actions/resolve-unanswered-question.action";

/**
 * Controller untuk PUT /api/owner/kb/unanswered/:id/resolve
 */
export async function resolveUnansweredQuestionController({
  owner,
  params,
  body,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  params: { id: string };
  body: { resolved_by_kb_id?: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: any;
}) {
  const updated = await runOwnerTx(async (tx) => {
    return await resolveUnansweredQuestionAction(
      tx,
      owner.id,
      params.id,
      body?.resolved_by_kb_id || null
    );
  });

  if (!updated) {
    return errorResponse(
      set,
      "QUESTION_NOT_FOUND",
      "Pertanyaan belum terjawab tidak ditemukan.",
      HTTP_STATUS.NOT_FOUND
    );
  }

  return successResponse({ question: updated }, "Pertanyaan berhasil ditandai selesai.");
}
