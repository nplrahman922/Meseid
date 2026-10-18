import { Elysia } from "elysia";
import { verifySession, SESSION_COOKIE_NAME, SessionPayload } from "../lib/session";
import { withSystemContext, withOwnerContext, withAdminContext, Tx } from "../db/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "owner" | "admin";
  status: string;
}

export interface AuthenticatedOwner {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  timezone: string;
  status: string;
  suspendedReason?: string | null;
}

/**
 * Extracts and verifies the session token from either:
 * 1. Authorization: Bearer <token> header
 * 2. meseid_session HTTP-only cookie
 */
export function extractSessionFromRequest(
  headers: Record<string, string | undefined>,
  cookieToken?: string
): SessionPayload | null {
  const authHeader = headers.authorization || headers.Authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) return null;
  return verifySession(token);
}

/**
 * Elysia plugin for session extraction across all routes
 */
export const sessionPlugin = new Elysia({ name: "sessionPlugin" })
  .derive({ as: "global" }, ({ headers, cookie }) => {
    const cookieToken = cookie[SESSION_COOKIE_NAME]?.value;
    const session = extractSessionFromRequest(
      headers as any,
      typeof cookieToken === "string" ? cookieToken : undefined
    );
    return { session };
  });

/**
 * Guard for any authenticated user (Owner or Admin).
 * Validates against the live database using meseid_system_ctx.
 */
export const requireAuth = new Elysia({ name: "requireAuth" })
  .use(sessionPlugin)
  .onBeforeHandle({ as: "global" }, async ({ session, set }) => {
    if (!session) {
      set.status = 401;
      return {
        error: "UNAUTHORIZED",
        message: "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
      };
    }

    const [userRow] = await withSystemContext(async (tx) => {
      return await tx<{ id: string; email: string; role: string; status: string }[]>`
        SELECT id, email, role, status FROM users WHERE id = ${session.userId}::uuid;
      `;
    });

    if (!userRow) {
      set.status = 401;
      return {
        error: "UNAUTHORIZED",
        message: "Pengguna tidak ditemukan.",
      };
    }

    if (userRow.status === "suspended") {
      set.status = 403;
      return {
        error: "ACCOUNT_SUSPENDED",
        message: "Akun Anda sedang ditangguhkan.",
      };
    }

    if (userRow.status === "deleted") {
      set.status = 401;
      return {
        error: "UNAUTHORIZED",
        message: "Akun ini telah dihapus.",
      };
    }
  })
  .derive({ as: "global" }, async ({ session }) => {
    if (!session) return { user: null as unknown as AuthenticatedUser };
    const [userRow] = await withSystemContext(async (tx) => {
      return await tx<{ id: string; email: string; role: "owner" | "admin"; status: string }[]>`
        SELECT id, email, role, status FROM users WHERE id = ${session.userId}::uuid;
      `;
    });
    return {
      user: userRow
        ? {
            id: userRow.id,
            email: userRow.email,
            role: userRow.role,
            status: userRow.status,
          }
        : (null as unknown as AuthenticatedUser),
    };
  });

/**
 * Guard for Owner-only routes (SRS NFR-04.2, FR-50.2, TC-17).
 * Verifies owner status and provides `runOwnerTx` helper.
 */
export const requireOwner = new Elysia({ name: "requireOwner" })
  .use(sessionPlugin)
  .onBeforeHandle({ as: "global" }, async ({ session, set }) => {
    if (!session) {
      set.status = 401;
      return {
        error: "UNAUTHORIZED",
        message: "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
      };
    }

    const [userRow] = await withSystemContext(async (tx) => {
      return await tx<{ id: string; email: string; role: string; status: string }[]>`
        SELECT id, email, role, status FROM users WHERE id = ${session.userId}::uuid;
      `;
    });

    if (!userRow) {
      set.status = 401;
      return {
        error: "UNAUTHORIZED",
        message: "Pengguna tidak ditemukan.",
      };
    }

    if (userRow.status === "suspended") {
      set.status = 403;
      return {
        error: "ACCOUNT_SUSPENDED",
        message: "Akun Anda sedang ditangguhkan.",
      };
    }

    if (session.role !== "owner") {
      set.status = 403;
      return {
        error: "FORBIDDEN",
        message: "Akses ditolak. Rute ini hanya dapat diakses oleh Pemilik Usaha (Owner).",
      };
    }

    const [ownerRow] = await withSystemContext(async (tx) => {
      return await tx<{
        id: string;
        user_id: string;
        business_name: string;
        business_type: string;
        timezone: string;
        status: string;
        suspended_reason: string | null;
      }[]>`
        SELECT id, user_id, business_name, business_type, timezone, status, suspended_reason
        FROM owners
        WHERE user_id = ${session.userId}::uuid;
      `;
    });

    if (!ownerRow) {
      set.status = 404;
      return {
        error: "NOT_FOUND",
        message: "Profil bisnis pemilik belum terdaftar.",
      };
    }

    if (ownerRow.status === "suspended") {
      set.status = 403;
      return {
        error: "ACCOUNT_SUSPENDED",
        message: "Akun Anda sedang ditangguhkan.",
        reason: ownerRow.suspended_reason,
      };
    }
  })
  .derive({ as: "global" }, async ({ session }) => {
    if (!session || session.role !== "owner") {
      return {
        user: null as unknown as AuthenticatedUser,
        owner: null as unknown as AuthenticatedOwner,
        runOwnerTx: null as unknown as <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>,
      };
    }

    const [userRow] = await withSystemContext(async (tx) => {
      return await tx<{ id: string; email: string; role: "owner"; status: string }[]>`
        SELECT id, email, role, status FROM users WHERE id = ${session.userId}::uuid;
      `;
    });

    const [ownerRow] = await withSystemContext(async (tx) => {
      return await tx<{
        id: string;
        user_id: string;
        business_name: string;
        business_type: string;
        timezone: string;
        status: string;
        suspended_reason: string | null;
      }[]>`
        SELECT id, user_id, business_name, business_type, timezone, status, suspended_reason
        FROM owners
        WHERE user_id = ${session.userId}::uuid;
      `;
    });

    if (!userRow || !ownerRow) {
      return {
        user: null as unknown as AuthenticatedUser,
        owner: null as unknown as AuthenticatedOwner,
        runOwnerTx: null as unknown as <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>,
      };
    }

    const owner: AuthenticatedOwner = {
      id: ownerRow.id,
      userId: ownerRow.user_id,
      businessName: ownerRow.business_name,
      businessType: ownerRow.business_type,
      timezone: ownerRow.timezone,
      status: ownerRow.status,
      suspendedReason: ownerRow.suspended_reason,
    };

    const runOwnerTx = <T>(fn: (tx: Tx) => Promise<T>) =>
      withOwnerContext(owner.id, session.userId, fn);

    return { user: userRow, owner, runOwnerTx };
  });

/**
 * Guard for Admin-only routes (SRS NFR-04.3, TC-16).
 * Immediately rejects non-admin users (such as owners) with 403.
 */
export const requireAdmin = new Elysia({ name: "requireAdmin" })
  .use(sessionPlugin)
  .onBeforeHandle({ as: "global" }, async ({ session, set }) => {
    if (!session) {
      set.status = 401;
      return {
        error: "UNAUTHORIZED",
        message: "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
      };
    }

    if (session.role === "owner" || session.role !== "admin") {
      set.status = 403;
      return {
        error: "FORBIDDEN",
        message: "Akses ditolak. Halaman ini khusus Admin Sistem.",
      };
    }

    const [userRow] = await withSystemContext(async (tx) => {
      return await tx<{ id: string; email: string; role: string; status: string }[]>`
        SELECT id, email, role, status FROM users WHERE id = ${session.userId}::uuid;
      `;
    });

    if (!userRow) {
      set.status = 401;
      return {
        error: "UNAUTHORIZED",
        message: "Pengguna tidak ditemukan.",
      };
    }

    if (userRow.status === "suspended") {
      set.status = 403;
      return {
        error: "ACCOUNT_SUSPENDED",
        message: "Akun Anda sedang ditangguhkan.",
      };
    }
  })
  .derive({ as: "global" }, ({ session }) => {
    if (!session || session.role !== "admin") {
      return {
        runAdminTx: null as unknown as <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>,
      };
    }
    const runAdminTx = <T>(fn: (tx: Tx) => Promise<T>) =>
      withAdminContext(session.userId, fn);

    return { runAdminTx };
  });
