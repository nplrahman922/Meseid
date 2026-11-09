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
      set.status = 400;
      return errorResponse("Payload business_hours wajib diisi");
    }

    const updated = await runOwnerTx(async (tx) => {
      return await updateJamOperasional(tx, owner.id, body);
    });

    return successResponse("Berhasil memperbarui konfigurasi jam operasional", updated);
  } catch (err: any) {
    set.status = 500;
    return errorResponse(`Gagal memperbarui jam operasional: ${err.message}`);
  }
}
