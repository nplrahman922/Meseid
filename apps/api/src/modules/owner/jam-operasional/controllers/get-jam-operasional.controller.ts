import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { getJamOperasional } from "../actions/get-jam-operasional.action";

/**
 * Controller untuk GET /api/owner/jam-operasional
 */
export async function getJamOperasionalController({
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
      return await getJamOperasional(tx, owner.id);
    });

    if (!data) {
      set.status = 404;
      return errorResponse("Profil bisnis owner tidak ditemukan");
    }

    return successResponse("Berhasil memuat konfigurasi jam operasional", data);
  } catch (err: any) {
    set.status = 500;
    return errorResponse(`Gagal memuat jam operasional: ${err.message}`);
  }
}
