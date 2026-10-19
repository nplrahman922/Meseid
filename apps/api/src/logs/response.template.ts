export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export interface StandardSuccessResponse<T = any> {
  status: "ok";
  message?: string;
  data?: T;
  [key: string]: any;
}

export interface StandardErrorResponse {
  error: string;
  message: string;
  reason?: string | null;
  details?: any;
  [key: string]: any;
}

export interface SetContext {
  status?: number | string;
  headers?: Record<string, string>;
}

/**
 * Standard success response builder.
 */
export function successResponse<T extends Record<string, any>>(
  payload?: T,
  message?: string
): StandardSuccessResponse<T> {
  const res: StandardSuccessResponse<T> = {
    status: "ok",
    ...(message ? { message } : {}),
    ...(payload || ({} as T)),
  };
  return res;
}

/**
 * Standard error response builder. Sets HTTP status code and returns error payload.
 */
export function errorResponse(
  set: SetContext,
  errorCode: string,
  message: string,
  status: number = HTTP_STATUS.BAD_REQUEST,
  extras?: Record<string, any>
): StandardErrorResponse {
  set.status = status;
  return {
    error: errorCode,
    message,
    ...(extras || {}),
  };
}

/**
 * Validation error template (HTTP 400).
 */
export function validationErrorResponse(
  set: SetContext,
  message: string = "Data yang dikirimkan tidak valid.",
  extras?: Record<string, any>
): StandardErrorResponse {
  return errorResponse(set, "VALIDATION_ERROR", message, HTTP_STATUS.BAD_REQUEST, extras);
}

/**
 * Unauthorized error template (HTTP 401).
 */
export function unauthorizedResponse(
  set: SetContext,
  message: string = "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali."
): StandardErrorResponse {
  return errorResponse(set, "UNAUTHORIZED", message, HTTP_STATUS.UNAUTHORIZED);
}

/**
 * Forbidden error template (HTTP 403).
 */
export function forbiddenResponse(
  set: SetContext,
  message: string = "Akses ditolak."
): StandardErrorResponse {
  return errorResponse(set, "FORBIDDEN", message, HTTP_STATUS.FORBIDDEN);
}

/**
 * Account suspended error template (HTTP 403).
 */
export function suspendedResponse(
  set: SetContext,
  message: string = "Akun Anda sedang ditangguhkan.",
  reason?: string | null
): StandardErrorResponse {
  return errorResponse(
    set,
    "ACCOUNT_SUSPENDED",
    message,
    HTTP_STATUS.FORBIDDEN,
    reason !== undefined ? { reason } : undefined
  );
}

/**
 * Account deleted error template (HTTP 403).
 */
export function deletedAccountResponse(
  set: SetContext,
  message: string = "Akun ini telah dihapus."
): StandardErrorResponse {
  return errorResponse(set, "ACCOUNT_DELETED", message, HTTP_STATUS.FORBIDDEN);
}

/**
 * Resource not found error template (HTTP 404).
 */
export function notFoundResponse(
  set: SetContext,
  message: string = "Data tidak ditemukan."
): StandardErrorResponse {
  return errorResponse(set, "NOT_FOUND", message, HTTP_STATUS.NOT_FOUND);
}

/**
 * Internal server error template (HTTP 500).
 */
export function internalErrorResponse(
  set: SetContext,
  message: string = "Terjadi kesalahan internal pada sistem."
): StandardErrorResponse {
  return errorResponse(
    set,
    "INTERNAL_SERVER_ERROR",
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}
