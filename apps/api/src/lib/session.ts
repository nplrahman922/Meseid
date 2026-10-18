import { env } from "../config/env";
import { signHmac, verifyHmacSignature } from "./crypto";

export interface SessionPayload {
  userId: string;
  ownerId?: string | null;
  role: "owner" | "admin";
  email?: string;
  exp: number; // Unix timestamp in milliseconds
}

export const SESSION_COOKIE_NAME = "meseid_session";
export const DEFAULT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Creates a signed stateless session token.
 * Format: [Base64Url-encoded payload].[HMAC-SHA256 signature]
 */
export function signSession(
  payload: Omit<SessionPayload, "exp"> & { exp?: number },
  durationMs: number = DEFAULT_SESSION_DURATION_MS
): string {
  const fullPayload: SessionPayload = {
    userId: payload.userId,
    ownerId: payload.ownerId ?? null,
    role: payload.role,
    email: payload.email,
    exp: payload.exp ?? Date.now() + durationMs,
  };

  const payloadStr = JSON.stringify(fullPayload);
  const dataB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const signature = signHmac(dataB64, env.SESSION_SECRET);

  return `${dataB64}.${signature}`;
}

/**
 * Verifies and decodes a stateless session token.
 * Returns null if token is tampered, malformed, or expired.
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [dataB64, signature] = parts;
    const isValidSig = verifyHmacSignature(dataB64, signature, env.SESSION_SECRET);
    if (!isValidSig) {
      return null;
    }

    const payloadStr = Buffer.from(dataB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr) as SessionPayload;

    if (!payload.userId || !payload.role || !payload.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Standard cookie configuration for the session token.
 */
export function getSessionCookieOptions(durationMs: number = DEFAULT_SESSION_DURATION_MS) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(durationMs / 1000),
  };
}
