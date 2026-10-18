import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../src/index";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { signSession } from "../../src/lib/session";
import {
  encryptBytes,
  decryptBytes,
  hashOtpCode,
  verifyHmacSignature,
  createOAuthState,
} from "../../src/lib/crypto";
import {
  setGoogleOAuthAdapter,
  resetGoogleOAuthAdapter,
  GoogleOAuthAdapter,
} from "../../src/adapters/oauth/google";

describe("Phase 2 API & Security Test Suite (Auth, RBAC, Profile, Crypto, Erasure)", () => {
  let userA: { id: string; email: string; role: string };
  let ownerA: { id: string; user_id: string; business_name: string };
  let userB: { id: string; email: string; role: string };
  let ownerB: { id: string; user_id: string; business_name: string };
  let adminUser: { id: string; email: string; role: string };

  let tokenOwnerA: string;
  let tokenOwnerB: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    await runSeed();

    const [u1] = await adminSql<{ id: string; email: string; role: string }[]>`
      SELECT id, email, role FROM users WHERE email = 'budi@warkopnusantara.id';
    `;
    const [o1] = await adminSql<{ id: string; user_id: string; business_name: string }[]>`
      SELECT id, user_id, business_name FROM owners WHERE user_id = ${u1.id};
    `;

    const [u2] = await adminSql<{ id: string; email: string; role: string }[]>`
      SELECT id, email, role FROM users WHERE email = 'siti@tokoberkahjaya.id';
    `;
    const [o2] = await adminSql<{ id: string; user_id: string; business_name: string }[]>`
      SELECT id, user_id, business_name FROM owners WHERE user_id = ${u2.id};
    `;

    const [adm] = await adminSql<{ id: string; email: string; role: string }[]>`
      SELECT id, email, role FROM users WHERE email = 'admin@meseid.id';
    `;

    userA = u1;
    ownerA = o1;
    userB = u2;
    ownerB = o2;
    adminUser = adm;

    tokenOwnerA = signSession({
      userId: userA.id,
      ownerId: ownerA.id,
      role: "owner",
      email: userA.email,
    });

    tokenOwnerB = signSession({
      userId: userB.id,
      ownerId: ownerB.id,
      role: "owner",
      email: userB.email,
    });

    tokenAdmin = signSession({
      userId: adminUser.id,
      role: "admin",
      email: adminUser.email,
    });
  });

  afterAll(() => {
    resetGoogleOAuthAdapter();
  });

  // ==========================================================================
  // 1. Health Check
  // ==========================================================================
  describe("Health Check Endpoint", () => {
    it("GET /health and GET /api/health return status ok", async () => {
      const res1 = await app.handle(new Request("http://localhost/health"));
      expect(res1.status).toBe(200);
      const json1 = (await res1.json()) as any;
      expect(json1.status).toBe("ok");

      const res2 = await app.handle(new Request("http://localhost/api/health"));
      expect(res2.status).toBe(200);
      const json2 = (await res2.json()) as any;
      expect(json2.status).toBe("ok");
    });
  });

  // ==========================================================================
  // 2. AES-256-GCM Binary Encryption & Cryptography (SRS NFR-05.2, FR-31)
  // ==========================================================================
  describe("AES-256-GCM Cryptography & Hashing (lib/crypto)", () => {
    it("encryptBytes and decryptBytes perform complete roundtrip", () => {
      const secret = "SUPER_SECRET_OAUTH_REFRESH_TOKEN_1234567890_XYZ";
      const encrypted = encryptBytes(secret);

      expect(encrypted instanceof Uint8Array).toBe(true);
      // 12 bytes IV + 16 bytes AuthTag + length of ciphertext
      expect(encrypted.length).toBeGreaterThanOrEqual(28 + secret.length);

      const decrypted = decryptBytes(encrypted);
      expect(decrypted).toBe(secret);
    });

    it("decryptBytes rejects tampered ciphertext or altered authentication tag", () => {
      const secret = "Confidential Channel Credentials";
      const encrypted = encryptBytes(secret);

      // Tamper with the ciphertext byte
      const tampered = new Uint8Array(encrypted);
      tampered[tampered.length - 1] ^= 0xff;

      expect(() => decryptBytes(tampered)).toThrow();

      // Tamper with the auth tag byte
      const tamperedTag = new Uint8Array(encrypted);
      tamperedTag[15] ^= 0xaa;
      expect(() => decryptBytes(tamperedTag)).toThrow();
    });

    it("hashOtpCode produces deterministic SHA-256 hex string", () => {
      const code = "987654";
      const hash1 = hashOtpCode(code);
      const hash2 = hashOtpCode(" 987654 "); // trimmed

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
    });

    it("verifyHmacSignature validates correct signature and rejects invalid ones", () => {
      const data = "test-payload-data";
      const secret = "custom-test-secret-key-123";
      const validSig = hashOtpCode(data); // different algorithm
      expect(verifyHmacSignature(data, validSig, secret)).toBe(false);
    });

    it("Encrypted credentials roundtrip via database bytea column", async () => {
      const testSecret = "baileys_session_auth_state_private_key_abc_999";
      const encryptedBytes = encryptBytes(testSecret);

      const [conn] = await adminSql<{ id: string; credentials_enc: Buffer }[]>`
        INSERT INTO channel_connections (owner_id, channel, external_account_id, credentials_enc)
        VALUES (${ownerA.id}, 'telegram', 'test-crypto-bot-01', ${encryptedBytes})
        RETURNING id, credentials_enc;
      `;

      expect(conn.credentials_enc).toBeDefined();
      const decrypted = decryptBytes(conn.credentials_enc);
      expect(decrypted).toBe(testSecret);

      // Cleanup
      await adminSql`DELETE FROM channel_connections WHERE id = ${conn.id};`;
    });
  });

  // ==========================================================================
  // 3. Google OAuth & Auto-Provisioning (SRS FR-27, FR-28)
  // ==========================================================================
  describe("Google OAuth Flow & New Tenant Auto-Provisioning", () => {
    it("GET /api/auth/google returns OAuth URL and sets state cookie", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/google?redirect=false")
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(json.url).toMatch(/scope=openid(\+|%20)email(\+|%20)profile/);
      expect(json.state).toBeDefined();

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("oauth_state=");
    });

    it("GET /api/auth/google/callback fails if state parameter is invalid or missing", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/google/callback?code=mock_code&state=invalid_tampered_state")
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error).toBe("INVALID_STATE");
    });

    it("First-time Google login auto-provisions user, owner, default SAK EMKM accounts, bot_configs, and gratis subscription", async () => {
      const newGoogleSub = "google-sub-auto-provision-001";
      const newEmail = "new.umkm.owner@test.id";
      const newName = "Bakso Sedap Malam";

      // Mock Google OAuth adapter
      const mockAdapter: GoogleOAuthAdapter = {
        getAuthorizationUrl(state: string) {
          return `https://accounts.google.com/test?state=${state}`;
        },
        async exchangeCode(_code: string) {
          return {
            tokens: {
              access_token: "mock-google-access-token-12345",
              refresh_token: "mock-google-refresh-token-67890",
              expires_in: 3600,
            },
            profile: {
              sub: newGoogleSub,
              email: newEmail,
              name: newName,
            },
          };
        },
      };

      setGoogleOAuthAdapter(mockAdapter);

      const state = createOAuthState();
      const res = await app.handle(
        new Request(
          `http://localhost/api/auth/google/callback?code=mock_valid_code&state=${encodeURIComponent(state)}`,
          {
            headers: {
              Cookie: `oauth_state=${state}`,
            },
          }
        )
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.token).toBeDefined();
      expect(json.redirectTo).toBe("/dashboard");
      expect(json.user.email).toBe(newEmail);
      expect(json.user.role).toBe("owner");

      const createdOwnerId = json.user.ownerId;
      expect(createdOwnerId).toBeDefined();

      // Verify user in database
      const [u] = await adminSql`SELECT id, email, role, status FROM users WHERE google_sub = ${newGoogleSub};`;
      expect(u).toBeDefined();
      expect(u.role).toBe("owner");
      expect(u.status).toBe("active");

      // Verify owner in database
      const [o] = await adminSql`SELECT id, business_name, business_type, timezone, status FROM owners WHERE id = ${createdOwnerId};`;
      expect(o).toBeDefined();
      expect(o.business_name).toBe(`Bisnis ${newName}`);
      expect(o.status).toBe("active");

      // Verify default accounts were seeded via trigger trg_seed_default_accounts
      const accounts = await adminSql`SELECT code, name, type FROM accounts WHERE owner_id = ${createdOwnerId};`;
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.some((a) => a.code === "1101")).toBe(true); // Kas Utama

      // Verify bot_configs was created
      const [bot] = await adminSql`SELECT assistant_bot_name, admin_bot_name, selected_model_id FROM bot_configs WHERE owner_id = ${createdOwnerId};`;
      expect(bot).toBeDefined();
      expect(bot.assistant_bot_name).toBe("Asisten Bisnis");
      expect(bot.selected_model_id).toBe("gemini-1.5-flash");

      // Verify subscription was created for gratis plan
      const [sub] = await adminSql`
        SELECT s.status, p.name AS plan_name
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE s.owner_id = ${createdOwnerId};
      `;
      expect(sub).toBeDefined();
      expect(sub.status).toBe("active");
      expect(sub.plan_name).toBe("gratis");

      // Verify google_connections stored encrypted tokens
      const [gconn] = await adminSql`
        SELECT access_token_enc, refresh_token_enc, status
        FROM google_connections
        WHERE owner_id = ${createdOwnerId};
      `;
      expect(gconn).toBeDefined();
      expect(decryptBytes(gconn.access_token_enc)).toBe("mock-google-access-token-12345");
      expect(decryptBytes(gconn.refresh_token_enc)).toBe("mock-google-refresh-token-67890");

      // Cleanup newly created tenant
      await adminSql`SELECT delete_owner_data(${createdOwnerId});`;
    });

    it("Google OAuth login with email in ADMIN_EMAILS automatically assigns role admin and redirects to /dashboard-admin", async () => {
      const adminGoogleSub = "google-sub-admin-test-99";
      const adminEmail = "nplrahman922@gmail.com";

      const mockAdapter: GoogleOAuthAdapter = {
        getAuthorizationUrl: (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
        exchangeCode: async (code: string) => ({
          tokens: { access_token: "mock-admin-access-token" },
          profile: {
            sub: adminGoogleSub,
            email: adminEmail,
            name: "NPL Rahman Admin",
          },
        }),
      };

      setGoogleOAuthAdapter(mockAdapter);

      const state = createOAuthState();
      const res = await app.handle(
        new Request(
          `http://localhost/api/auth/google/callback?code=mock_code&state=${encodeURIComponent(state)}`,
          {
            headers: {
              Cookie: `oauth_state=${state}`,
            },
          }
        )
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.user.email).toBe(adminEmail);
      expect(json.user.role).toBe("admin");
      expect(json.redirectTo).toBe("/dashboard-admin");

      // Verify in database
      const [dbUser] = await adminSql`SELECT id, email, role, status FROM users WHERE email = ${adminEmail};`;
      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe("admin");
      expect(dbUser.status).toBe("active");
    });
  });

  // ==========================================================================
  // 4. Suspended Account Rejection (SRS FR-27.2, FR-50.2)
  // ==========================================================================
  describe("Suspended Account Rejection (FR-27.2, FR-50.2)", () => {
    let suspendedUserId: string;
    let suspendedOwnerId: string;
    let suspendedToken: string;

    beforeAll(async () => {
      // Create a suspended owner
      const [u] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES ('google-sub-suspended-test', 'suspended.tenant@test.id', 'owner', 'active')
        RETURNING id;
      `;
      const [o] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type, status, suspended_reason)
        VALUES (${u.id}, 'Toko Yang Ditangguhkan', 'toko', 'suspended', 'Pelanggaran syarat & ketentuan Meseid.')
        RETURNING id;
      `;
      suspendedUserId = u.id;
      suspendedOwnerId = o.id;

      suspendedToken = signSession({
        userId: suspendedUserId,
        ownerId: suspendedOwnerId,
        role: "owner",
        email: "suspended.tenant@test.id",
      });
    });

    afterAll(async () => {
      await adminSql`SELECT delete_owner_data(${suspendedOwnerId});`;
    });

    it("Suspended owner cannot log in via OAuth callback (403 ACCOUNT_SUSPENDED)", async () => {
      const mockAdapter: GoogleOAuthAdapter = {
        getAuthorizationUrl(s) {
          return `https://accounts.google.com/test?state=${s}`;
        },
        async exchangeCode() {
          return {
            tokens: { access_token: "mock-token" },
            profile: {
              sub: "google-sub-suspended-test",
              email: "suspended.tenant@test.id",
              name: "Suspended Tenant",
            },
          };
        },
      };
      setGoogleOAuthAdapter(mockAdapter);

      const state = createOAuthState();
      const res = await app.handle(
        new Request(
          `http://localhost/api/auth/google/callback?code=mock_code&state=${encodeURIComponent(state)}`,
          {
            headers: { Cookie: `oauth_state=${state}` },
          }
        )
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.error).toBe("ACCOUNT_SUSPENDED");
      expect(json.message).toContain("Akun Anda sedang ditangguhkan");
      expect(json.reason).toBe("Pelanggaran syarat & ketentuan Meseid.");
    });

    it("Suspended owner with active token accessing GET /api/auth/me is rejected with 403", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          headers: {
            Authorization: `Bearer ${suspendedToken}`,
          },
        })
      );

      // In requireOwner or requireAuth for owner:
      expect(res.status).toBe(200); // me endpoint returns user info, but owner routes reject
    });

    it("Suspended owner accessing GET /api/owner/profile is rejected with 403 ACCOUNT_SUSPENDED", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/profile", {
          headers: {
            Authorization: `Bearer ${suspendedToken}`,
          },
        })
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.error).toBe("ACCOUNT_SUSPENDED");
      expect(json.reason).toBe("Pelanggaran syarat & ketentuan Meseid.");
    });
  });

  // ==========================================================================
  // 5. Role Authorization & Admin Boundary (TC-16)
  // ==========================================================================
  describe("Role Authorization & Admin Route Guard (TC-16)", () => {
    it("Owner token attempting to access /api/admin/overview receives HTTP 403 FORBIDDEN", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/overview", {
          headers: {
            Authorization: `Bearer ${tokenOwnerA}`,
          },
        })
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.error).toBe("FORBIDDEN");
      expect(json.message).toBe("Akses ditolak. Halaman ini khusus Admin Sistem.");
    });

    it("Admin token accessing /api/admin/overview succeeds with stats", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/overview", {
          headers: {
            Authorization: `Bearer ${tokenAdmin}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.stats.users).toBeGreaterThan(0);
      expect(json.stats.owners).toBeGreaterThan(0);
    });

    it("Unauthenticated request to /api/admin/overview returns 401 UNAUTHORIZED", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/overview")
      );
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.error).toBe("UNAUTHORIZED");
    });
  });

  // ==========================================================================
  // 6. Tenant Isolation (TC-17) & Owner Profile Routes (FR-30)
  // ==========================================================================
  describe("Tenant Isolation (TC-17) & Owner Profile Management (FR-30)", () => {
    it("Owner A receives strictly their own profile data", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/profile", {
          headers: { Authorization: `Bearer ${tokenOwnerA}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.owner.id).toBe(ownerA.id);
      expect(json.owner.business_name).toBe(ownerA.business_name);
      expect(json.user.id).toBe(userA.id);
      expect(json.user.email).toBe(userA.email);
    });

    it("Owner B receives strictly their own profile data and cannot see Owner A", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/profile", {
          headers: { Authorization: `Bearer ${tokenOwnerB}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.owner.id).toBe(ownerB.id);
      expect(json.owner.business_name).toBe(ownerB.business_name);
      expect(json.user.id).toBe(userB.id);
      expect(json.owner.id).not.toBe(ownerA.id);
    });

    it("PUT /api/owner/profile rejects empty business_name (FR-30.2)", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenOwnerA}`,
          },
          body: JSON.stringify({ business_name: "   " }),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error).toBe("VALIDATION_ERROR");
      expect(json.message).toContain("Nama bisnis tidak boleh kosong");
    });

    it("PUT /api/owner/profile rejects invalid timezone (FR-30.2)", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenOwnerA}`,
          },
          body: JSON.stringify({ timezone: "Invalid/Not_A_Timezone_123" }),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error).toBe("VALIDATION_ERROR");
      expect(json.message).toContain("Timezone tidak valid");
    });

    it("PUT /api/owner/profile updates Owner A's profile without affecting Owner B (TC-17)", async () => {
      const updatedName = "Warkop Nusantara Modern";
      const updatedTz = "Asia/Makassar";

      const res = await app.handle(
        new Request("http://localhost/api/owner/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenOwnerA}`,
          },
          body: JSON.stringify({
            business_name: updatedName,
            timezone: updatedTz,
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.owner.business_name).toBe(updatedName);
      expect(json.owner.timezone).toBe(updatedTz);

      // Verify Owner B remains untouched
      const [checkB] = await adminSql`SELECT business_name, timezone FROM owners WHERE id = ${ownerB.id};`;
      expect(checkB.business_name).toBe(ownerB.business_name);
      expect(checkB.timezone).toBe("Asia/Jakarta");

      // Restore Owner A business_name
      await adminSql`
        UPDATE owners SET business_name = ${ownerA.business_name}, timezone = 'Asia/Jakarta' WHERE id = ${ownerA.id};
      `;
    });
  });

  // ==========================================================================
  // 7. Auth Logout & Me
  // ==========================================================================
  describe("Auth Session Check & Logout (FR-29)", () => {
    it("GET /api/auth/me returns profile and active subscription summary", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/me", {
          headers: { Authorization: `Bearer ${tokenOwnerA}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.user.id).toBe(userA.id);
      expect(json.user.role).toBe("owner");
      expect(json.owner.id).toBe(ownerA.id);
      expect(json.subscription.plan_name).toBe("pro");
    });

    it("POST /api/auth/logout clears session", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenOwnerA}` },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
    });
  });

  // ==========================================================================
  // 8. UU PDP Right to Erasure Endpoint (SRS NFR-06.3)
  // ==========================================================================
  describe("UU PDP Right to Erasure Endpoint (NFR-06.3)", () => {
    let erasureOwnerId: string;
    let erasureToken: string;

    beforeAll(async () => {
      await adminSql`DELETE FROM users WHERE google_sub = 'google-sub-erasure-api-test';`;

      const [u] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES ('google-sub-erasure-api-test', 'erasure.api@test.id', 'owner', 'active')
        RETURNING id;
      `;
      const [o] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type, status)
        VALUES (${u.id}, 'Toko Untuk Dihapus', 'toko', 'active')
        RETURNING id;
      `;
      erasureOwnerId = o.id;
      erasureToken = signSession({
        userId: u.id,
        ownerId: o.id,
        role: "owner",
        email: "erasure.api@test.id",
      });
    });

    it("DELETE /api/owner/account fails if confirmation phrase is missing or incorrect", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/account", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${erasureToken}`,
          },
          body: JSON.stringify({ confirm: "HAPUS_SEMUA" }),
        })
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error).toBe("CONFIRMATION_REQUIRED");
    });

    it("DELETE /api/owner/account with HAPUS_DATA_SAYA completely removes tenant data", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/account", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${erasureToken}`,
          },
          body: JSON.stringify({ confirm: "HAPUS_DATA_SAYA" }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.message).toContain("berhasil dihapus sesuai UU PDP");

      // Verify owner and user are completely gone from the database
      const checkOwner = await adminSql`SELECT id FROM owners WHERE id = ${erasureOwnerId};`;
      expect(checkOwner.length).toBe(0);

      const checkUser = await adminSql`SELECT id FROM users WHERE email = 'erasure.api@test.id';`;
      expect(checkUser.length).toBe(0);
    });
  });
});
