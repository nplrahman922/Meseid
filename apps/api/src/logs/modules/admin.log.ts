import { createModuleLogger } from "../logger";
import { internalErrorResponse, SetContext, StandardErrorResponse } from "../response.template";

export const adminLogger = createModuleLogger("admin");

/**
 * Logs administrative metrics/overview inquiry.
 */
export function logAdminOverviewAccessed(adminId?: string): void {
  adminLogger.info(`Admin operational overview requested by ${adminId || "admin"}`, {
    action: "admin_overview",
    adminId,
  });
}

/**
 * Handles and logs admin operational errors.
 */
export function handleAdminOperationError(
  set: SetContext,
  action: string,
  err: any
): StandardErrorResponse {
  adminLogger.error(`Admin operation '${action}' failed`, err, {
    action,
  });
  return internalErrorResponse(set, `Terjadi kesalahan saat memproses ${action}.`);
}
