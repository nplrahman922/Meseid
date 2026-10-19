import { createModuleLogger } from "../logger";
import {
  errorResponse,
  validationErrorResponse,
  SetContext,
  StandardErrorResponse,
} from "../response.template";

export const ownerLogger = createModuleLogger("owner");

/**
 * Handles and logs input validation failures for owner profile updates.
 */
export function handleOwnerValidationError(
  set: SetContext,
  message: string,
  field?: string
): StandardErrorResponse {
  ownerLogger.warn(`Validation failed on owner profile: ${message}`, {
    action: "validate_profile_update",
    field,
  });
  return validationErrorResponse(set, message);
}

/**
 * Handles and logs missing UU PDP erasure confirmation keyword.
 */
export function handleErasureConfirmationMissing(
  set: SetContext,
  ownerId: string
): StandardErrorResponse {
  ownerLogger.warn("Account erasure request rejected: Invalid or missing confirmation phrase", {
    action: "right_to_erasure",
    ownerId,
  });
  return errorResponse(
    set,
    "CONFIRMATION_REQUIRED",
    "Konfirmasi HAPUS_DATA_SAYA diperlukan untuk menghapus akun secara permanen.",
    400
  );
}

/**
 * Logs successful update of owner tenant profile.
 */
export function logOwnerProfileUpdated(
  ownerId: string,
  updatedFields: Record<string, any>
): void {
  ownerLogger.info(`Owner profile updated successfully for tenant ${ownerId}`, {
    action: "profile_updated",
    ownerId,
    changes: updatedFields,
  });
}

/**
 * Logs permanent tenant data deletion under UU PDP.
 */
export function logOwnerErasureExecuted(ownerId: string): void {
  ownerLogger.warn(`[CRITICAL] Tenant data purged permanently under UU PDP Right to Erasure: ${ownerId}`, {
    action: "right_to_erasure_completed",
    ownerId,
  });
}
