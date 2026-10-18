import { Elysia, t } from "elysia";
import { env } from "../config/env";
import { createOAuthState, verifyOAuthState, encryptBytes } from "../lib/crypto";
import { signSession, SESSION_COOKIE_NAME, getSessionCookieOptions } from "../lib/session";
import { getGoogleOAuthAdapter } from "../adapters/oauth/google";
import { adminSql, withSystemContext } from "../db/client";
import { requireAuth, sessionPlugin } from "../middleware/auth";

export const authRoutes = new Elysia()
  .use(sessionPlugin)

  // 1. GET /api/auth/google
  .get(
    "/google",
    ({ query, cookie, redirect, headers }) => {
      const rawHost = (headers as any)?.["x-forwarded-host"] || (headers as any)?.["host"] || "";
      const proto = (headers as any)?.["x-forwarded-proto"] || "http";
      const host = rawHost;
      const requestOrigin = host ? `${proto}://${host}` : undefined;

      // Dynamically select redirect URI matching whatever host/port the user accessed
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
    },
    {
      query: t.Optional(
        t.Object({
          redirect: t.Optional(t.String()),
          returnUrl: t.Optional(t.String()),
        })
      ),
    }
  )

  // 2. GET /api/auth/google/callback
  .get(
    "/google/callback",
    async ({ query, cookie, set, headers, redirect }) => {
      const { code, state, error } = query;

      if (error) {
        set.status = 400;
        return {
          error: "OAUTH_ERROR",
          message: `Google OAuth error: ${error}`,
        };
      }

      if (!code || !state) {
        set.status = 400;
        return {
          error: "MISSING_PARAMETERS",
          message: "Parameter code dan state wajib disertakan.",
        };
      }

      // Validate CSRF state against cookie or signed token
      const cookieState = cookie.oauth_state?.value;
      const verifiedState = verifyOAuthState(state);

      if (!verifiedState || (cookieState && cookieState !== state)) {
        set.status = 400;
        return {
          error: "INVALID_STATE",
          message: "Parameter state OAuth tidak valid atau telah kedaluwarsa.",
        };
      }

      // Clear OAuth state cookie
      cookie.oauth_state.remove();

      // Exchange code for Google profile via adapter
      const customRedirectUri = (verifiedState as any)?.redirectUri;
      let tokens;
      let profile;
      try {
        const adapter = getGoogleOAuthAdapter();
        const exchanged = await adapter.exchangeCode(code, customRedirectUri);
        tokens = exchanged.tokens;
        profile = exchanged.profile;
      } catch (err: any) {
        set.status = 400;
        return {
          error: "TOKEN_EXCHANGE_FAILED",
          message: err.message || "Gagal menukarkan token Google OAuth.",
        };
      }

      if (!profile || !profile.sub || !profile.email) {
        set.status = 400;
        return {
          error: "INVALID_PROFILE",
          message: "Data profil Google tidak lengkap.",
        };
      }

      const normalizedEmail = (profile.email || "").toLowerCase().trim();
      const isAdmin = env.ADMIN_EMAILS.includes(normalizedEmail);
      const targetRole: "owner" | "admin" = isAdmin ? "admin" : "owner";

      // Check existing user via system context
      const [existingUser] = await withSystemContext(async (tx) => {
        return await tx<{ id: string; email: string; role: "owner" | "admin"; status: string }[]>`
          SELECT id, email, role, status FROM users 
          WHERE google_sub = ${profile.sub} OR LOWER(email) = ${normalizedEmail}
          LIMIT 1;
        `;
      });

      let userId: string;
      let userRole: "owner" | "admin" = targetRole;
      let ownerId: string | null = null;

      if (existingUser) {
        // Enforce account status check
        if (existingUser.status === "suspended") {
          set.status = 403;
          return {
            error: "ACCOUNT_SUSPENDED",
            message: "Akun Anda sedang ditangguhkan.",
          };
        }

        if (existingUser.status === "deleted") {
          set.status = 403;
          return {
            error: "ACCOUNT_DELETED",
            message: "Akun ini telah dihapus.",
          };
        }

        userId = existingUser.id;

        // Sync role if designated as admin in .env
        if (existingUser.role !== targetRole) {
          await adminSql`
            UPDATE users
            SET role = ${targetRole}, google_sub = ${profile.sub}, updated_at = now()
            WHERE id = ${userId}::uuid;
          `;
          userRole = targetRole;
        } else if (existingUser.email !== profile.email) {
          await adminSql`
            UPDATE users
            SET google_sub = ${profile.sub}, email = ${profile.email}, updated_at = now()
            WHERE id = ${userId}::uuid;
          `;
          userRole = existingUser.role;
        } else {
          userRole = existingUser.role;
        }

        if (userRole === "owner") {
          const [existingOwner] = await withSystemContext(async (tx) => {
            return await tx<{ id: string; status: string; suspended_reason: string | null }[]>`
              SELECT id, status, suspended_reason FROM owners WHERE user_id = ${userId}::uuid;
            `;
          });

          if (existingOwner) {
            if (existingOwner.status === "suspended") {
              set.status = 403;
              return {
                error: "ACCOUNT_SUSPENDED",
                message: "Akun Anda sedang ditangguhkan.",
                reason: existingOwner.suspended_reason,
              };
            }
            ownerId = existingOwner.id;
          }
        }
      } else if (isAdmin) {
        // Auto-provision brand new Admin user
        const [newAdmin] = await adminSql`
          INSERT INTO users (google_sub, email, role, status)
          VALUES (${profile.sub}, ${normalizedEmail}, 'admin', 'active')
          RETURNING id, email, role, status;
        `;
        userId = newAdmin.id;
        userRole = "admin";
      } else {
        // Auto-provision brand new Owner using adminSql
        const businessName = profile.name ? `Bisnis ${profile.name}` : "Bisnis Saya";

        const provisioned = await adminSql.begin(async (tx) => {
          // 1. Insert user
          const [newUser] = await tx<{ id: string; email: string; role: "owner"; status: string }[]>`
            INSERT INTO users (google_sub, email, role, status)
            VALUES (${profile.sub}, ${profile.email}, 'owner', 'active')
            RETURNING id, email, role, status;
          `;

          // 2. Insert owner (automatically triggers default accounts seeding via trg_seed_default_accounts)
          const [newOwner] = await tx<{ id: string; business_name: string; business_type: string; timezone: string }[]>`
            INSERT INTO owners (user_id, business_name, business_type, timezone, status)
            VALUES (${newUser.id}, ${businessName}, 'lainnya', 'Asia/Jakarta', 'active')
            RETURNING id, business_name, business_type, timezone;
          `;

          // 3. Insert default bot_configs
          await tx`
            INSERT INTO bot_configs (
              owner_id,
              assistant_bot_name,
              assistant_persona_prompt,
              admin_bot_name,
              admin_persona_prompt,
              persona_prompt,
              selected_model_id,
              customer_access_mode,
              auto_reply_enabled,
              business_hours
            ) VALUES (
              ${newOwner.id},
              'Asisten Bisnis',
              'Kamu adalah asisten internal pemilik bisnis untuk membantu pembukuan, stok, dan laporan keuangan.',
              'Admin Toko',
              'Kamu adalah asisten ramah toko yang melayani pertanyaan produk dan pesanan pelanggan.',
              'Kamu adalah asisten ramah toko.',
              'gemini-1.5-flash',
              'open',
              true,
              '{}'::jsonb
            );
          `;

          // 4. Assign default free subscription (name = 'gratis') if exists
          const [freePlan] = await tx<{ id: string }[]>`
            SELECT id FROM plans WHERE name IN ('gratis', 'free') LIMIT 1;
          `;

          if (freePlan) {
            await tx`
              INSERT INTO subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
              VALUES (${newOwner.id}, ${freePlan.id}, 'active', now(), now() + interval '30 days')
              ON CONFLICT (owner_id) DO NOTHING;
            `;
          }

          // 5. Store Google tokens encrypted if available
          if (tokens.access_token || tokens.refresh_token) {
            const accessEnc = tokens.access_token ? encryptBytes(tokens.access_token) : null;
            const refreshEnc = tokens.refresh_token ? encryptBytes(tokens.refresh_token) : null;

            await tx`
              INSERT INTO google_connections (owner_id, access_token_enc, refresh_token_enc, status)
              VALUES (${newOwner.id}, ${accessEnc}, ${refreshEnc}, 'connected')
              ON CONFLICT (owner_id) DO UPDATE
              SET access_token_enc = EXCLUDED.access_token_enc,
                  refresh_token_enc = COALESCE(EXCLUDED.refresh_token_enc, google_connections.refresh_token_enc),
                  status = 'connected',
                  updated_at = now();
            `;
          }

          return { user: newUser, owner: newOwner };
        });

        userId = provisioned.user.id;
        userRole = provisioned.user.role;
        ownerId = provisioned.owner.id;
      }

      // Generate signed stateless session token
      const sessionToken = signSession({
        userId,
        ownerId,
        role: userRole,
        email: profile.email,
      });

      // Set session cookie
      cookie[SESSION_COOKIE_NAME].set({
        value: sessionToken,
        ...getSessionCookieOptions(),
      });

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
    },
    {
      query: t.Object({
        code: t.Optional(t.String()),
        state: t.Optional(t.String()),
        error: t.Optional(t.String()),
        redirect: t.Optional(t.String()),
      }),
    }
  )

  // 3. POST /api/auth/logout
  .post("/logout", ({ cookie }) => {
    cookie[SESSION_COOKIE_NAME]?.remove();
    return {
      status: "ok",
      message: "Berhasil logout.",
    };
  })

  // 4. GET /api/auth/me
  .use(requireAuth)
  .get("/me", async ({ user }) => {
    let ownerData = null;
    let subscriptionData = null;

    if (user.role === "owner") {
      const [ownerRow] = await withSystemContext(async (tx) => {
        return await tx<{
          id: string;
          business_name: string;
          business_type: string;
          timezone: string;
          status: string;
        }[]>`
          SELECT id, business_name, business_type, timezone, status
          FROM owners
          WHERE user_id = ${user.id}::uuid;
        `;
      });

      if (ownerRow) {
        ownerData = ownerRow;

        const [subRow] = await withSystemContext(async (tx) => {
          return await tx<{
            plan_name: string;
            display_name: string;
            status: string;
            current_period_end: Date | null;
          }[]>`
            SELECT p.name AS plan_name, p.display_name, s.status, s.current_period_end
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.owner_id = ${ownerRow.id}::uuid;
          `;
        });
        subscriptionData = subRow || null;
      }
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
  });
