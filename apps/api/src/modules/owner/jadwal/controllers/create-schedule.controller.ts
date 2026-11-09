import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { createScheduleAction } from "../actions/create-schedule.action";
import type { CreateScheduleInput } from "../jadwal.types";

/**
 * Controller untuk POST /api/owner/jadwal/schedules
 */
export async function createScheduleController({
  owner,
  body,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  body: CreateScheduleInput;
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    const data = await runOwnerTx(async (tx) => {
      return await createScheduleAction(tx, owner.id, body);
    });

    return successResponse({ data }, "Jadwal berhasil ditambahkan");
  } catch (err: any) {
    const isConflict = err.message?.includes("bertabrakan") || err.message?.includes("exclude");
    return errorResponse(
      set,
      isConflict ? "CONFLICT" : "CREATE_FAILED",
      err.message,
      isConflict ? 409 : 400
    );
  }
}
