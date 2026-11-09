import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { listBookingsAction } from "../actions/list-bookings.action";
import type { BookingStatus } from "../jadwal.types";

/**
 * Controller untuk GET /api/owner/jadwal/bookings
 */
export async function listBookingsController({
  owner,
  query,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  query?: { status?: BookingStatus };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const data = await runOwnerTx(async (tx) => {
      return await listBookingsAction(tx, owner.id, query?.status);
    });

    return successResponse({ data }, "Berhasil memuat daftar booking");
  } catch (err: any) {
    return errorResponse(set, "FETCH_FAILED", `Gagal memuat booking: ${err.message}`, 500);
  }
}
