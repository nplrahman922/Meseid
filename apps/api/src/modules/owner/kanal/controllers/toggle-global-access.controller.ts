import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { toggleGlobalAccessAction } from "../actions/toggle-global-access.action";

/**
 * Controller untuk PUT /api/owner/kanal/global-access
 */
export async function toggleGlobalAccessController({
  owner,
  body,
  runOwnerTx,
}: {
  owner: { id: string };
  body: { mode: "open" | "whitelist" };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const result = await runOwnerTx(async (tx) => {
    return await toggleGlobalAccessAction(tx, owner.id, body.mode);
  });

  return successResponse(result, `Mode akses berhasil diubah ke ${body.mode}.`);
}
