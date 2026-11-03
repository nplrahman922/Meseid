import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { getOnboardingDetail } from "../actions/get-onboarding-detail.action";

/**
 * Controller untuk GET /api/owner/onboarding-detail
 * Mengembalikan konfigurasi lengkap onboarding untuk Pre-fill Overview.
 */
export async function getOnboardingDetailController({
  owner,
  runOwnerTx,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const data = await runOwnerTx(async (tx) => {
    return await getOnboardingDetail(tx, owner.id);
  });

  return successResponse({ data }, "Detail konfigurasi onboarding berhasil diambil.");
}
