import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { updateJamOperasional } from "../actions/update-jam-operasional.action";
import type { UpdateJamOperasionalInput } from "../jam-operasional.types";

/**
 * Controller untuk PUT /api/owner/jam-operasional
 */
export async function updateJamOperasionalController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: UpdateJamOperasionalInput;
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  try {
    if (!body || !body.business_hours) {
      return errorResponse(set, "BAD_REQUEST", "Payload business_hours wajib diisi", 400);
    }

    const updated = await runOwnerTx(async (tx) => {
      return await updateJamOperasional(tx, owner.id, body);
    });

    return successResponse({ data: updated }, "Berhasil memperbarui konfigurasi jam operasional");
  } catch (err: any) {
    return errorResponse(
      set,
      "UPDATE_FAILED",
      `Gagal memperbarui jam operasional: ${err.message}`,
      500
    );
  }
}
