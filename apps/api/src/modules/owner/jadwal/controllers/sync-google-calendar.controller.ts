import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { syncGoogleCalendarAction } from "../actions/sync-google-calendar.action";

/**
 * Controller untuk POST /api/owner/jadwal/sync-google
 */
export async function syncGoogleCalendarController({
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
      return await syncGoogleCalendarAction(tx, owner.id);
    });

    return successResponse({ data }, data.message);
  } catch (err: any) {
    return errorResponse(set, "SYNC_FAILED", `Gagal sinkronisasi Google Calendar: ${err.message}`, 500);
  }
}
