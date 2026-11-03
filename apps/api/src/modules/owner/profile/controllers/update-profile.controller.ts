import { Tx } from "../../../../db/client";
import { handleOwnerValidationError, logOwnerProfileUpdated, successResponse } from "../../../../logs";
import { updateOwnerProfile } from "../actions/update-profile.action";

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const VALID_BUSINESS_TYPES = ["kuliner", "toko", "jasa", "lainnya"] as const;

/**
 * Controller untuk PUT /api/owner/profile
 */
export async function updateOwnerProfileController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: {
    business_name?: string;
    business_type?: string;
    custom_business_type?: string;
    business_description?: string;
    phone?: string;
    timezone?: string;
  };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  const { business_name, business_type, custom_business_type, business_description, phone, timezone } = body;

  if (business_name !== undefined) {
    if (typeof business_name !== "string" || business_name.trim().length === 0) {
      return handleOwnerValidationError(set, "Nama bisnis tidak boleh kosong.", "business_name");
    }
  }

  if (business_type !== undefined) {
    if (!VALID_BUSINESS_TYPES.includes(business_type as any)) {
      return handleOwnerValidationError(
        set,
        `Tipe bisnis tidak valid. Pilihan: ${VALID_BUSINESS_TYPES.join(", ")}.`,
        "business_type"
      );
    }
  }

  if (timezone !== undefined) {
    if (typeof timezone !== "string" || !isValidTimeZone(timezone)) {
      return handleOwnerValidationError(
        set,
        "Timezone tidak valid. Gunakan format IANA seperti 'Asia/Jakarta'.",
        "timezone"
      );
    }
  }

  const updatedOwner = await runOwnerTx(async (tx) => {
    return await updateOwnerProfile(tx, owner.id, {
      business_name,
      business_type,
      custom_business_type,
      business_description,
      phone,
      timezone,
    });
  });

  logOwnerProfileUpdated(owner.id, { business_name, business_type, timezone });

  return successResponse(
    { owner: updatedOwner },
    "Profil bisnis berhasil diperbarui."
  );
}
