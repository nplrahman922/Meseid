import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { analyzeContactBehaviorAction } from "../actions/analyze-contact-behavior.action";
import { AnalyzeBehaviorInput } from "../kanal-access.types";

/**
 * Controller untuk POST /api/owner/kanal/analyze-behavior
 */
export async function analyzeContactBehaviorController({
  owner,
  body,
  runOwnerTx,
}: {
  owner: { id: string };
  body: AnalyzeBehaviorInput;
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const result = await runOwnerTx(async (tx) => {
    return await analyzeContactBehaviorAction(tx, owner.id, body);
  });

  return successResponse(result, "Analisis perilaku kontak berhasil diperbarui.");
}
