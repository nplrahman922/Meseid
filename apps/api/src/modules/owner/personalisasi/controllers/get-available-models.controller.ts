import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { getAvailableModelsForOwner } from "../model-access.guard";

/**
 * Controller untuk GET /api/owner/personalisasi/models
 * Mengambil katalog model AI yang tersedia bagi owner beserta status aksesibilitasnya.
 */
export async function getAvailableBotModelsController({
  owner,
  runOwnerTx,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const result = await runOwnerTx(async (tx) => {
    return await getAvailableModelsForOwner(tx, owner.id);
  });

  return successResponse(result, "Daftar model AI bot berhasil diambil.");
}
