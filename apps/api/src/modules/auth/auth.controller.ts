import { env } from "../../config/env";
import { createOAuthState, verifyOAuthState } from "../../lib/crypto";
import { signSession, SESSION_COOKIE_NAME, getSessionCookieOptions } from "../../lib/session";
import { getGoogleOAuthAdapter } from "../../adapters/oauth/google";
import {
  handleOAuthError,
  handleMissingOAuthParameters,
  handleInvalidOAuthState,
  handleTokenExchangeError,
  handleInvalidGoogleProfile,
  handleSuspendedLogin,
  handleDeletedLogin,
  logAuthSuccess,
  logLogout,
  successResponse,
} from "../../logs";
import {
  findUserByGoogleOrEmail,
  findOwnerByUserId,
  updateUserRoleAndGoogleSub,
  updateUserGoogleSubAndEmail,
  createAdminUser,
  provisionNewOwner,
  getMeOwnerDetails,
} from "./auth.model";

/**
 * Controller for GET /api/auth/google
 */
export async function googleAuthRedirectController({
  query,
  cookie,
  redirect,
  headers,
}: {
  query: { redirect?: string; returnUrl?: string };
  cookie: Record<string, any>;
  redirect: (url: string) => any;
  headers: Record<string, string | undefined>;
}) {
  const rawHost = (headers as any)?.["x-forwarded-host"] || (headers as any)?.["host"] || "";
  const proto = (headers as any)?.["x-forwarded-proto"] || "http";
  const host = rawHost;
  const requestOrigin = host ? `${proto}://${host}` : undefined;

  let effectiveRedirectUri = env.GOOGLE_REDIRECT_URI;
  if (host && (host.includes("tailf714eb.ts.net") || host.includes("100.100.229.39") || host === "localhost" || host.startsWith("localhost:"))) {
    effectiveRedirectUri = `${proto}://${host}/api/auth/google/callback`;
  }

  const state = createOAuthState({
    returnUrl: query.returnUrl || "/dashboard",
    origin: requestOrigin,
    redirectUri: effectiveRedirectUri,
  });

  cookie.oauth_state.set({
    value: state,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const adapter = getGoogleOAuthAdapter();
  const authUrl = adapter.getAuthorizationUrl(state, effectiveRedirectUri);

  if (query.redirect === "false") {
    return {
      url: authUrl,
      state,
    };
  }

  return redirect(authUrl);
}

/**
 * Controller for GET /api/auth/google/callback
 */
export async function googleAuthCallbackController({
  query,
  cookie,
  set,
  headers,
  redirect,
}: {
  query: { code?: string; state?: string; error?: string; redirect?: string };
  cookie: Record<string, any>;
  set: { status?: number | string };
  headers: Record<string, string | undefined>;
  redirect: (url: string) => any;
}) {
  const { code, state, error } = query;

  if (error) {
    return handleOAuthError(set, error);
  }

  if (!code || !state) {
    return handleMissingOAuthParameters(set);
  }

  const cookieState = cookie.oauth_state?.value;
  const verifiedState = verifyOAuthState(state);

  if (!verifiedState || (cookieState && cookieState !== state)) {
    return handleInvalidOAuthState(set);
  }

  cookie.oauth_state.remove();

  const customRedirectUri = (verifiedState as any)?.redirectUri;
  let tokens;
  let profile;
  try {
    const adapter = getGoogleOAuthAdapter();
    const exchanged = await adapter.exchangeCode(code, customRedirectUri);
    tokens = exchanged.tokens;
    profile = exchanged.profile;
  } catch (err: any) {
    return handleTokenExchangeError(set, err);
  }

  if (!profile || !profile.sub || !profile.email) {
    return handleInvalidGoogleProfile(set);
  }

  const normalizedEmail = (profile.email || "").toLowerCase().trim();
  const isAdmin = env.ADMIN_EMAILS.includes(normalizedEmail);
  const targetRole: "owner" | "admin" = isAdmin ? "admin" : "owner";

  const existingUser = await findUserByGoogleOrEmail(profile.sub, normalizedEmail);

  let userId: string;
  let userRole: "owner" | "admin" = targetRole;
  let ownerId: string | null = null;
  let isNewTenant = false;

  if (existingUser) {
    if (existingUser.status === "suspended") {
      return handleSuspendedLogin(set, existingUser.id, existingUser.email);
    }

    if (existingUser.status === "deleted") {
      return handleDeletedLogin(set, existingUser.id, existingUser.email);
    }

    userId = existingUser.id;

    if (existingUser.role !== targetRole) {
      await updateUserRoleAndGoogleSub(userId, targetRole, profile.sub);
      userRole = targetRole;
    } else if (existingUser.email !== profile.email) {
      await updateUserGoogleSubAndEmail(userId, profile.sub, profile.email);
      userRole = existingUser.role;
    } else {
      userRole = existingUser.role;
    }

    if (userRole === "owner") {
      const existingOwner = await findOwnerByUserId(userId);

      if (existingOwner) {
        if (existingOwner.status === "suspended") {
          return handleSuspendedLogin(
            set,
            userId,
            profile.email,
            existingOwner.suspended_reason
          );
        }
        ownerId = existingOwner.id;
      }
    }
  } else if (isAdmin) {
    const newAdmin = await createAdminUser({
      googleSub: profile.sub,
      email: normalizedEmail,
    });
    userId = newAdmin.id;
    userRole = "admin";
  } else {
    isNewTenant = true;
    const provisioned = await provisionNewOwner({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name,
      tokens,
    });

    userId = provisioned.user.id;
    userRole = provisioned.user.role;
    ownerId = provisioned.owner.id;
  }

  const sessionToken = signSession({
    userId,
    ownerId,
    role: userRole,
    email: profile.email,
  });

  cookie[SESSION_COOKIE_NAME].set({
    value: sessionToken,
    ...getSessionCookieOptions(),
  });

  logAuthSuccess(userId, profile.email, userRole, ownerId, isNewTenant);

  const redirectTo = userRole === "admin" ? "/dashboard-admin" : "/dashboard";

  const acceptHeader = (headers as any)?.accept || "";
  const isBrowserHtmlRequest = typeof acceptHeader === "string" && acceptHeader.includes("text/html");

  const targetOrigin = (verifiedState as any)?.origin || env.FRONTEND_URL;
  if (query.redirect === "true" || isBrowserHtmlRequest) {
    return redirect(`${targetOrigin}${redirectTo}`);
  }

  return {
    status: "ok",
    token: sessionToken,
    redirectTo,
    user: {
      id: userId,
      email: profile.email,
      role: userRole,
      ownerId,
    },
  };
}

/**
 * Controller for POST /api/auth/logout
 */
export function logoutController({ cookie }: { cookie: Record<string, any> }) {
  cookie[SESSION_COOKIE_NAME]?.remove();
  logLogout();
  return successResponse(undefined, "Berhasil logout.");
}

/**
 * Controller for GET /api/auth/me
 */
export async function getMeController({
  user,
}: {
  user: { id: string; email: string; role: "owner" | "admin"; status: string };
}) {
  let ownerData = null;
  let subscriptionData = null;

  if (user.role === "owner") {
    const meDetails = await getMeOwnerDetails(user.id);
    ownerData = meDetails.owner;
    subscriptionData = meDetails.subscription;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    owner: ownerData,
    subscription: subscriptionData,
  };
}
