import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { respondBookingAction } from "../actions/respond-booking.action";

/**
 * Controller untuk POST /api/owner/jadwal/bookings/:id/respond
 */
export async function respondBookingController({
  owner,
  params,
  body,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  params: { id: string };
  body: { action: "approve" | "reject"; notes?: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const data = await runOwnerTx(async (tx) => {
      return await respondBookingAction(tx, owner.id, {
        bookingId: params.id,
        action: body.action,
        notes: body.notes,
      });
    });

    const actionText = body.action === "approve" ? "disetujui" : "ditolak";
    return successResponse({ data }, `Permintaan booking berhasil ${actionText}`);
  } catch (err: any) {
    const isConflict = err.message?.includes("bertabrakan") || err.message?.includes("exclude");
    return errorResponse(
      set,
      isConflict ? "CONFLICT" : "RESPOND_FAILED",
      err.message,
      isConflict ? 409 : 400
    );
  }
}
