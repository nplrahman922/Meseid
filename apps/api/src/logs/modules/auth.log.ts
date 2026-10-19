import { createModuleLogger } from "../logger";
import {
  errorResponse,
  suspendedResponse,
  deletedAccountResponse,
  SetContext,
  StandardErrorResponse,
} from "../response.template";

export const authLogger = createModuleLogger("auth");

/**
 * Handles and logs OAuth provider errors (e.g. user canceled Google OAuth).
 */
export function handleOAuthError(set: SetContext, error: string): StandardErrorResponse {
  authLogger.warn(`OAuth provider error received: ${error}`, { action: "oauth_callback" });
  return errorResponse(set, "OAUTH_ERROR", `Google OAuth error: ${error}`, 400);
}

/**
 * Handles and logs missing code/state parameters in OAuth callback.
 */
export function handleMissingOAuthParameters(set: SetContext): StandardErrorResponse {
  authLogger.warn("OAuth callback invoked with missing code or state parameters", {
    action: "oauth_callback",
  });
  return errorResponse(
    set,
    "MISSING_PARAMETERS",
    "Parameter code dan state wajib disertakan.",
    400
  );
}

/**
 * Handles and logs CSRF state mismatch or expiration.
 */
export function handleInvalidOAuthState(set: SetContext): StandardErrorResponse {
  authLogger.warn("Invalid or expired OAuth state detected (potential CSRF attempt)", {
    action: "oauth_callback",
  });
  return errorResponse(
    set,
    "INVALID_STATE",
    "Parameter state OAuth tidak valid atau telah kedaluwarsa.",
    400
  );
}

/**
 * Handles and logs token exchange failures with Google OAuth endpoints.
 */
export function handleTokenExchangeError(set: SetContext, err: any): StandardErrorResponse {
  authLogger.error("Failed to exchange authorization code for tokens", err, {
    action: "token_exchange",
  });
  return errorResponse(
    set,
    "TOKEN_EXCHANGE_FAILED",
    err?.message || "Gagal menukarkan token Google OAuth.",
    400
  );
}

/**
 * Handles and logs incomplete Google profile data.
 */
export function handleInvalidGoogleProfile(set: SetContext): StandardErrorResponse {
  authLogger.warn("Incomplete user profile received from Google API", {
    action: "fetch_profile",
  });
  return errorResponse(
    set,
    "INVALID_PROFILE",
    "Data profil Google tidak lengkap.",
    400
  );
}

/**
 * Handles and logs rejected login attempts by suspended users or tenants.
 */
export function handleSuspendedLogin(
  set: SetContext,
  userId: string,
  email: string,
  reason?: string | null
): StandardErrorResponse {
  authLogger.warn(`Login rejected: Account is suspended for user ${email}`, {
    action: "check_account_status",
    userId,
    email,
    reason,
  });
  return suspendedResponse(set, "Akun Anda sedang ditangguhkan.", reason);
}

/**
 * Handles and logs rejected login attempts by deleted users.
 */
export function handleDeletedLogin(
  set: SetContext,
  userId: string,
  email: string
): StandardErrorResponse {
  authLogger.warn(`Login rejected: Account has been deleted for user ${email}`, {
    action: "check_account_status",
    userId,
    email,
  });
  return deletedAccountResponse(set, "Akun ini telah dihapus.");
}

/**
 * Logs successful authentication and token issuance.
 */
export function logAuthSuccess(
  userId: string,
  email: string,
  role: string,
  ownerId?: string | null,
  isNewTenant: boolean = false
): void {
  authLogger.info(`User authenticated successfully: ${email} [${role}]`, {
    action: isNewTenant ? "tenant_provisioned" : "user_login",
    userId,
    email,
    role,
    ownerId: ownerId || null,
  });
}

/**
 * Logs user logout event.
 */
export function logLogout(userId?: string): void {
  authLogger.info(`User logged out: ${userId || "unknown"}`, { action: "user_logout", userId });
}
