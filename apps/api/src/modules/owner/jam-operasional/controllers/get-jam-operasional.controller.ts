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
      return errorResponse(set, "NOT_FOUND", "Profil bisnis owner tidak ditemukan", 404);
    }

    return successResponse({ data }, "Berhasil memuat konfigurasi jam operasional");
  } catch (err: any) {
    return errorResponse(
      set,
      "FETCH_FAILED",
      `Gagal memuat jam operasional: ${err.message}`,
      500
    );
  }
}
