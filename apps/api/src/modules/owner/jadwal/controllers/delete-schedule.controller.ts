import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { deleteScheduleAction } from "../actions/delete-schedule.action";

/**
 * Controller untuk DELETE /api/owner/jadwal/schedules/:id
 */
export async function deleteScheduleController({
  owner,
  params,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  params: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const data = await runOwnerTx(async (tx) => {
      return await deleteScheduleAction(tx, owner.id, params.id);
    });

    return successResponse({ data }, "Jadwal berhasil dihapus/dibatalkan");
  } catch (err: any) {
    return errorResponse(set, "DELETE_FAILED", `Gagal menghapus jadwal: ${err.message}`, 400);
  }
}
