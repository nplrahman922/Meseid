import { Tx } from "../../../../db/client";
import { successResponse, validationErrorResponse } from "../../../../logs";
import { upsertAccessRuleAction } from "../actions/upsert-access-rule.action";
import { UpsertAccessRuleInput } from "../kanal-access.types";

/**
 * Controller untuk PUT /api/owner/kanal/access-rules
 */
export async function upsertAccessRuleController({
  owner,
  body,
  runOwnerTx,
  set,
}: {
  owner: { id: string };
  body: UpsertAccessRuleInput;
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: any;
}) {
  try {
    const rule = await runOwnerTx(async (tx) => {
      return await upsertAccessRuleAction(tx, owner.id, body);
    });

    return successResponse({ rule }, "Aturan akses kontak/grup berhasil disimpan.");
  } catch (err: any) {
    return validationErrorResponse(set, err.message || "Gagal menyimpan aturan akses kontak/grup.");
  }
}
