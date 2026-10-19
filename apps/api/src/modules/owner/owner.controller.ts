import { Tx } from "../../db/client";
import { SESSION_COOKIE_NAME } from "../../lib/session";
import {
  handleOwnerValidationError,
  handleErasureConfirmationMissing,
  logOwnerProfileUpdated,
  logOwnerErasureExecuted,
  successResponse,
} from "../../logs";
import {
  getOwnerProfileAndBotConfig,
  updateOwnerProfile,
  deleteOwnerData,
} from "./owner.model";

/**
 * Validates whether a timezone identifier is a recognized IANA timezone.
 */
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
 * Controller for GET /api/owner/profile
 */
export async function getOwnerProfileController({
  owner,
  user,
  runOwnerTx,
}: {
  owner: { id: string };
  user: { id: string; email: string; role: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const profile = await runOwnerTx(async (tx) => {
    return await getOwnerProfileAndBotConfig(tx, owner.id);
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    owner: profile.owner,
    bot_config: profile.botConfig,
  };
}

/**
 * Controller for PUT /api/owner/profile
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
    timezone?: string;
  };
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  const { business_name, business_type, timezone } = body;

  // Validate business_name
  if (business_name !== undefined) {
    if (typeof business_name !== "string" || business_name.trim().length === 0) {
      return handleOwnerValidationError(set, "Nama bisnis tidak boleh kosong.", "business_name");
    }
  }

  // Validate business_type
  if (business_type !== undefined) {
    if (!VALID_BUSINESS_TYPES.includes(business_type as any)) {
      return handleOwnerValidationError(
        set,
        `Tipe bisnis tidak valid. Pilihan: ${VALID_BUSINESS_TYPES.join(", ")}.`,
        "business_type"
      );
    }
  }

  // Validate timezone
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
      timezone,
    });
  });

  logOwnerProfileUpdated(owner.id, { business_name, business_type, timezone });

  return successResponse(
    { owner: updatedOwner },
    "Profil bisnis berhasil diperbarui."
  );
}

/**
 * Controller for DELETE /api/owner/account (UU PDP Right to Erasure)
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

  // Execute erasure procedure delete_owner_data(app_owner_id()) under owner context
  await runOwnerTx(async (tx) => {
    await deleteOwnerData(tx, owner.id);
  });

  // Clear session cookie
  cookie[SESSION_COOKIE_NAME]?.remove();

  logOwnerErasureExecuted(owner.id);

  return successResponse(
    undefined,
    "Seluruh data akun Anda telah berhasil dihapus sesuai UU PDP."
  );
}
