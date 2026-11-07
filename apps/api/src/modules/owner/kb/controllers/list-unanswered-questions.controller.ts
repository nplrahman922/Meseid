import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { listUnansweredQuestionsAction } from "../actions/list-unanswered-questions.action";

/**
 * Controller untuk GET /api/owner/kb/unanswered
 */
export async function listUnansweredQuestionsController({
  owner,
  query,
  runOwnerTx,
}: {
  owner: { id: string };
  query: { resolved?: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const resolvedFilter = query.resolved !== undefined ? query.resolved === "true" : false;

  const questions = await runOwnerTx(async (tx) => {
    return await listUnansweredQuestionsAction(tx, owner.id, {
      resolved: resolvedFilter,
    });
  });

  return successResponse({ questions });
}
