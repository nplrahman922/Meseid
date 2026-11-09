import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { getSchedulesAction } from "../actions/get-schedules.action";

/**
 * Controller untuk GET /api/owner/jadwal/schedules
 */
export async function getSchedulesController({
  owner,
  query,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  query?: { timeMin?: string; timeMax?: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const data = await runOwnerTx(async (tx) => {
      return await getSchedulesAction(tx, owner.id, query);
    });

    return successResponse({ data }, "Berhasil memuat daftar jadwal");
  } catch (err: any) {
    return errorResponse(set, "FETCH_FAILED", `Gagal memuat jadwal: ${err.message}`, 500);
  }
}
