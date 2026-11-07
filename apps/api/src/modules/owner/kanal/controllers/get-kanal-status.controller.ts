import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { getKanalStatusAction } from "../actions/get-kanal-status.action";

/**
 * Controller for GET /api/owner/kanal/status
 */
export async function getKanalStatusController({
  owner,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const result = await runOwnerTx(async (tx) => {
      return await getKanalStatusAction(tx, owner.id);
    });

    return successResponse({ data: result }, "Status kanal berhasil dimuat.");
  } catch (err: any) {
    return errorResponse(
      set,
      "STATUS_FETCH_FAILED",
      err.message || "Gagal memuat status kanal integrasi.",
      500
    );
  }
}
