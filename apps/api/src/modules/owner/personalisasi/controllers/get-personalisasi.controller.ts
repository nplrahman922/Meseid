import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { getPersonalisasi } from "../actions/get-personalisasi.action";

/**
 * Controller untuk GET /api/owner/personalisasi
 */
export async function getPersonalisasiController({
  owner,
  runOwnerTx,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const config = await runOwnerTx(async (tx) => {
    return await getPersonalisasi(tx, owner.id);
  });

  return successResponse({ config, data: config }, "Konfigurasi personalisasi berhasil diambil.");
}
