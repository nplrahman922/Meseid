import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { getGoogleStatusAction } from "../actions/get-google-status.action";

/**
 * Controller untuk GET /api/owner/jadwal/google-status
 */
export async function getGoogleStatusController({
  owner,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const data = await runOwnerTx(async (tx) => {
      return await getGoogleStatusAction(tx, owner.id);
    });

    return successResponse({ data }, "Berhasil memuat status koneksi Google Calendar");
  } catch (err: any) {
    return errorResponse(set, "FETCH_FAILED", `Gagal memuat status Google: ${err.message}`, 500);
  }
}
