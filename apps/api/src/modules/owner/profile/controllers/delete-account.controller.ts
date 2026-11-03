import { Tx } from "../../../../db/client";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";
import { handleErasureConfirmationMissing, logOwnerErasureExecuted, successResponse } from "../../../../logs";
import { deleteOwnerData } from "../actions/delete-account.action";

/**
 * Controller untuk DELETE /api/owner/account (UU PDP Right to Erasure)
 */
export async function deleteOwnerAccountController({
  body,
  owner,
  runOwnerTx,
  cookie,
  set,
}: {
  body: { confirm: string };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  cookie: Record<string, any>;
  set: { status?: number | string };
}) {
  if (body?.confirm !== "HAPUS_DATA_SAYA") {
    return handleErasureConfirmationMissing(set, owner.id);
  }

  await runOwnerTx(async (tx) => {
    await deleteOwnerData(tx, owner.id);
  });

  cookie[SESSION_COOKIE_NAME]?.remove();

  logOwnerErasureExecuted(owner.id);

  return successResponse(
    undefined,
    "Seluruh data akun Anda telah berhasil dihapus sesuai UU PDP."
  );
}
