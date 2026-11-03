import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { getOnboardingStatus } from "../actions/get-onboarding-status.action";

/**
 * Controller untuk GET /api/owner/onboarding-status
 */
export async function getOnboardingStatusController({
  owner,
  runOwnerTx,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const onboarding = await runOwnerTx(async (tx) => {
    return await getOnboardingStatus(tx, owner.id);
  });

  return successResponse({ onboarding }, "Status onboarding berhasil diambil.");
}
