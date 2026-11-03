import { Tx } from "../../../../db/client";
import { successResponse, handleOwnerValidationError } from "../../../../logs";
import { SubmitOnboardingInput } from "../onboarding.types";
import { executeOnboardingTransaction } from "../actions/execute-onboarding.action";

const VALID_BUSINESS_TYPES = ["kuliner", "toko", "jasa", "lainnya"] as const;

/**
 * Controller untuk POST /api/owner/onboarding
 * Menyimpan profil bisnis, bot terhubung, persona ganda, dan knowledge base secara atomik.
 */
export async function submitOnboardingController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: SubmitOnboardingInput;
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  if (!body.businessName || body.businessName.trim().length === 0) {
    return handleOwnerValidationError(set, "Nama bisnis wajib diisi.", "businessName");
  }

  if (!body.businessType || !VALID_BUSINESS_TYPES.includes(body.businessType as any)) {
    return handleOwnerValidationError(
      set,
      `Tipe bisnis tidak valid. Pilihan: ${VALID_BUSINESS_TYPES.join(", ")}.`,
      "businessType"
    );
  }

  const result = await runOwnerTx(async (tx) => {
    return await executeOnboardingTransaction(tx, owner.id, body);
  });

  return successResponse(
    { summary: result },
    "Setup onboarding berhasil disimpan secara permanen."
  );
}
