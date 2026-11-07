import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { listAccessRulesAction } from "../actions/list-access-rules.action";
import { ListAccessRulesFilter } from "../kanal-access.types";

/**
 * Controller untuk GET /api/owner/kanal/access-rules
 */
export async function listAccessRulesController({
  owner,
  query,
  runOwnerTx,
}: {
  owner: { id: string };
  query: ListAccessRulesFilter;
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const data = await runOwnerTx(async (tx) => {
    return await listAccessRulesAction(tx, owner.id, query);
  });

  return successResponse({ data }, "Daftar aturan akses kontak & grup berhasil diambil.");
}
