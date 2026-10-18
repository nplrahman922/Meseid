import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  adminSql,
  appSql,
  withContext,
  withOwnerContext,
  withAdminContext,
  withSystemContext,
} from "../../src/db/client";
import { runSeed } from "../../src/db/seed";

interface UserRow {
  id: string;
  email: string;
  role: string;
}

interface OwnerRow {
  id: string;
  user_id: string;
  business_name: string;
}

describe("Part A: Database Tenancy, Roles, RLS & Identity Foundation", () => {
  let userA: UserRow;
  let ownerA: OwnerRow;
  let userB: UserRow;
  let ownerB: OwnerRow;
  let adminUser: UserRow;

  beforeAll(async () => {
    // Ensure demo seed data is populated
    await runSeed();

    // Fetch seeded records for testing
    const [u1] = await adminSql<UserRow[]>`
      SELECT id, email, role FROM users WHERE email = 'budi@warkopnusantara.id';
    `;
    const [o1] = await adminSql<OwnerRow[]>`
      SELECT id, user_id, business_name FROM owners WHERE user_id = ${u1.id};
    `;

    const [u2] = await adminSql<UserRow[]>`
      SELECT id, email, role FROM users WHERE email = 'siti@tokoberkahjaya.id';
    `;
    const [o2] = await adminSql<OwnerRow[]>`
      SELECT id, user_id, business_name FROM owners WHERE user_id = ${u2.id};
    `;

    const [adm] = await adminSql<UserRow[]>`
      SELECT id, email, role FROM users WHERE email = 'admin@meseid.id';
    `;

    userA = u1;
    ownerA = o1;
    userB = u2;
    ownerB = o2;
    adminUser = adm;
  });

  // --------------------------------------------------------------------------
  // Application Role & Security Connection
  // --------------------------------------------------------------------------
  it("appSql must connect strictly as 'meseid_app' and NEVER as superuser", async () => {
    const [session] = await appSql<{ current_user: string; session_user: string }[]>`
      SELECT current_user, session_user;
    `;

    expect(session.current_user).toBe("meseid_app");
    expect(session.session_user).toBe("meseid_app");
    expect(session.current_user).not.toBe("meseid");
    expect(session.current_user).not.toBe("postgres");
  });

  // --------------------------------------------------------------------------
  // Context Switching & Tenancy Variables
  // --------------------------------------------------------------------------
  it("withOwnerContext sets LOCAL ROLE to meseid_owner_ctx with valid session vars", async () => {
    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      const [roleInfo] = await tx<{ current_user: string }[]>`
        SELECT current_user;
      `;
      const [ctxVars] = await tx<{ owner_id: string; user_id: string }[]>`
        SELECT app_owner_id() as owner_id, app_user_id() as user_id;
      `;

      expect(roleInfo.current_user).toBe("meseid_owner_ctx");
      expect(ctxVars.owner_id).toBe(ownerA.id);
      expect(ctxVars.user_id).toBe(userA.id);
    });
  });

  // --------------------------------------------------------------------------
  // TC-17: Cross-Tenant Isolation (Owner A cannot SELECT, UPDATE, DELETE Owner B rows)
  // --------------------------------------------------------------------------
  describe("TC-17: Cross-tenant isolation across EVERY owner-scoped table and view", () => {
    it("owners: Owner A cannot SELECT, UPDATE, or DELETE Owner B row", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        // SELECT
        const rows = await tx`
          SELECT * FROM owners WHERE id = ${ownerB.id};
        `;
        expect(rows.length).toBe(0);

        // UPDATE
        const updateResult = await tx`
          UPDATE owners SET business_name = 'Hacked Name' WHERE id = ${ownerB.id};
        `;
        expect(updateResult.count).toBe(0);

        // DELETE
        const deleteResult = await tx`
          DELETE FROM owners WHERE id = ${ownerB.id};
        `;
        expect(deleteResult.count).toBe(0);
      });

      // Verify Owner B data is unaltered
      const [ownerBCheck] = await adminSql<OwnerRow[]>`
        SELECT id, business_name FROM owners WHERE id = ${ownerB.id};
      `;
      expect(ownerBCheck.business_name).toBe(ownerB.business_name);
    });

    it("google_connections: Owner A cannot SELECT, UPDATE, or DELETE Owner B row", async () => {
      // Ensure Owner B has a google connection
      await adminSql`
        INSERT INTO google_connections (owner_id, scopes, status)
        VALUES (${ownerB.id}, ARRAY['https://www.googleapis.com/auth/calendar'], 'connected')
        ON CONFLICT (owner_id) DO NOTHING;
      `;

      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx`
          SELECT * FROM google_connections WHERE owner_id = ${ownerB.id};
        `;
        expect(rows.length).toBe(0);

        const updateRes = await tx`
          UPDATE google_connections SET status = 'revoked' WHERE owner_id = ${ownerB.id};
        `;
        expect(updateRes.count).toBe(0);

        const deleteRes = await tx`
          DELETE FROM google_connections WHERE owner_id = ${ownerB.id};
        `;
        expect(deleteRes.count).toBe(0);
      });

      const [check] = await adminSql`
        SELECT status FROM google_connections WHERE owner_id = ${ownerB.id};
      `;
      expect(check.status).toBe("connected");
    });

    it("channel_connections: Owner A cannot SELECT, UPDATE, or DELETE Owner B row", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx`
          SELECT * FROM channel_connections WHERE owner_id = ${ownerB.id};
        `;
        expect(rows.length).toBe(0);

        const updateRes = await tx`
          UPDATE channel_connections SET status = 'disconnected' WHERE owner_id = ${ownerB.id};
        `;
        expect(updateRes.count).toBe(0);

        const deleteRes = await tx`
          DELETE FROM channel_connections WHERE owner_id = ${ownerB.id};
        `;
        expect(deleteRes.count).toBe(0);
      });
    });

    it("bot_configs: Owner A cannot SELECT, UPDATE, or DELETE Owner B row", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx`
          SELECT * FROM bot_configs WHERE owner_id = ${ownerB.id};
        `;
        expect(rows.length).toBe(0);

        const updateRes = await tx`
          UPDATE bot_configs SET persona_prompt = 'Injected prompt' WHERE owner_id = ${ownerB.id};
        `;
        expect(updateRes.count).toBe(0);

        const deleteRes = await tx`
          DELETE FROM bot_configs WHERE owner_id = ${ownerB.id};
        `;
        expect(deleteRes.count).toBe(0);
      });
    });

    it("knowledge_base: Owner A cannot SELECT, UPDATE, or DELETE Owner B row", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx`
          SELECT * FROM knowledge_base WHERE owner_id = ${ownerB.id};
        `;
        expect(rows.length).toBe(0);

        const updateRes = await tx`
          UPDATE knowledge_base SET content = 'Compromised FAQ' WHERE owner_id = ${ownerB.id};
        `;
        expect(updateRes.count).toBe(0);

        const deleteRes = await tx`
          DELETE FROM knowledge_base WHERE owner_id = ${ownerB.id};
        `;
        expect(deleteRes.count).toBe(0);
      });
    });

    it("subscriptions: Owner A cannot SELECT Owner B subscription row", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx`
          SELECT * FROM subscriptions WHERE owner_id = ${ownerB.id};
        `;
        expect(rows.length).toBe(0);
      });
    });

    it("Generic Table Isolation: Owner B sees exactly 0 rows belonging to Owner A across EVERY owner_id table", async () => {
      const allOwnerTables = await adminSql<{ table_name: string }[]>`
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = 'public'
        WHERE c.table_schema = 'public'
          AND c.column_name = 'owner_id'
          AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name;
      `;

      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        for (const { table_name } of allOwnerTables) {
          const rows = await tx<{ count: string }[]>`
            SELECT count(*)::text as count FROM ${appSql(table_name)} WHERE owner_id = ${ownerA.id};
          `;
          expect(parseInt(rows[0].count, 10)).toBe(0);
        }
      });
    });

    it("Generic View Isolation: Owner B sees zero rows of Owner A in all reporting and financial views", async () => {
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const views = ["buku_besar", "neraca_saldo", "buku_kas", "subledger_aging"];
        for (const v of views) {
          const rows = await tx<{ count: string }[]>`
            SELECT count(*)::text as count FROM ${appSql(v)} WHERE owner_id = ${ownerA.id};
          `;
          expect(parseInt(rows[0].count, 10)).toBe(0);
        }
      });
    });
  });

  // --------------------------------------------------------------------------
  // INSERT cross-tenant spoofing must fail (RLS WITH CHECK)
  // --------------------------------------------------------------------------
  describe("INSERT cross-tenant spoofing must fail", () => {
    it("knowledge_base: INSERT with another owner_id throws RLS policy violation", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`
            INSERT INTO knowledge_base (owner_id, title, content)
            VALUES (${ownerB.id}, 'Spoofed Title', 'Spoofed Content');
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/violates row-level security policy/i);
      }
      expect(threw).toBe(true);
    });

    it("channel_connections: INSERT with another owner_id throws RLS policy violation", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`
            INSERT INTO channel_connections (owner_id, channel, external_account_id)
            VALUES (${ownerB.id}, 'whatsapp', '628999999999');
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/violates row-level security policy/i);
      }
      expect(threw).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // Owner A can manage their own data successfully
  // --------------------------------------------------------------------------
  it("Owner A can CRUD their own knowledge_base entries", async () => {
    let createdId: string | null = null;

    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      // CREATE
      const [inserted] = await tx<{ id: string }[]>`
        INSERT INTO knowledge_base (owner_id, title, content)
        VALUES (${ownerA.id}, 'Promo Hari Kemerdekaan', 'Diskon 17% kopi susu.')
        RETURNING id;
      `;
      createdId = inserted.id;

      // READ
      const [read] = await tx<{ title: string }[]>`
        SELECT title FROM knowledge_base WHERE id = ${createdId};
      `;
      expect(read.title).toBe("Promo Hari Kemerdekaan");

      // UPDATE
      await tx`
        UPDATE knowledge_base SET title = 'Promo Hari Kemerdekaan 45' WHERE id = ${createdId};
      `;

      // DELETE
      const del = await tx`
        DELETE FROM knowledge_base WHERE id = ${createdId};
      `;
      expect(del.count).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // owner_id immutability trigger
  // --------------------------------------------------------------------------
  it("Attempting to modify owner_id after insert throws immutable exception", async () => {
    let testItemId: string = "";

    // Insert an item for owner A
    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO knowledge_base (owner_id, title, content)
        VALUES (${ownerA.id}, 'Immutability Check', 'Content')
        RETURNING id;
      `;
      testItemId = row.id;
    });

    let threw = false;
    try {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        await tx`
          UPDATE knowledge_base SET owner_id = ${ownerB.id} WHERE id = ${testItemId};
        `;
      });
    } catch (err: any) {
      threw = true;
      // Triggers or RLS WITH CHECK reject the owner_id modification
      expect(err.message).toMatch(/immutable|violates row-level security policy/i);
    }
    expect(threw).toBe(true);

    // Cleanup
    await adminSql`DELETE FROM knowledge_base WHERE id = ${testItemId};`;
  });

  // --------------------------------------------------------------------------
  // Admin context gets permission denied on owner content tables
  // --------------------------------------------------------------------------
  describe("meseid_admin_ctx least-privilege boundary", () => {
    it("Admin is denied access to knowledge_base via GRANT (permission denied)", async () => {
      let threw = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`SELECT * FROM knowledge_base;`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied for table knowledge_base/i);
      }
      expect(threw).toBe(true);
    });

    it("Admin is denied access to google_connections via GRANT (permission denied)", async () => {
      let threw = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`SELECT * FROM google_connections;`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied for table google_connections/i);
      }
      expect(threw).toBe(true);
    });

    it("Admin is denied access to bot_configs via GRANT (permission denied)", async () => {
      let threw = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`SELECT * FROM bot_configs;`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied for table bot_configs/i);
      }
      expect(threw).toBe(true);
    });

    it("Admin CAN access administrative tables (users, owners metadata, plans, subscriptions)", async () => {
      await withAdminContext(adminUser.id, async (tx) => {
        const users = await tx`SELECT id, email FROM users;`;
        expect(users.length).toBeGreaterThan(0);

        const owners = await tx`SELECT id, business_name FROM owners;`;
        expect(owners.length).toBeGreaterThan(0);

        const plans = await tx`SELECT id, name FROM plans;`;
        expect(plans.length).toBeGreaterThanOrEqual(2);

        const subs = await tx`SELECT id, status FROM subscriptions;`;
        expect(subs.length).toBeGreaterThan(0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // SECURITY DEFINER: resolve_channel_identity
  // --------------------------------------------------------------------------
  it("resolve_channel_identity finds tenant before session context exists", async () => {
    // 1. WhatsApp lookup for Warkop Nusantara
    const [waResult] = await appSql<{ owner_id: string; business_name: string }[]>`
      SELECT * FROM resolve_channel_identity('whatsapp', '6281234567890');
    `;
    expect(waResult).toBeDefined();
    expect(waResult.owner_id).toBe(ownerA.id);
    expect(waResult.business_name).toBe("Warkop Nusantara");

    // 2. Telegram lookup for Toko Berkah Jaya
    const [tgResult] = await appSql<{ owner_id: string; business_name: string }[]>`
      SELECT * FROM resolve_channel_identity('telegram', '987654321');
    `;
    expect(tgResult).toBeDefined();
    expect(tgResult.owner_id).toBe(ownerB.id);
    expect(tgResult.business_name).toBe("Toko Berkah Jaya");

    // 3. Unregistered channel
    const nonExistent = await appSql`
      SELECT * FROM resolve_channel_identity('whatsapp', '000000000000');
    `;
    expect(nonExistent.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Function delete_owner_data(owner_id) for UU PDP Erasure
  // --------------------------------------------------------------------------
  it("delete_owner_data permanently erases all owner records (UU PDP No. 27/2022)", async () => {
    // 1. Create a dummy tenant to erase
    await adminSql`DELETE FROM users WHERE google_sub = 'pdp-test-sub-999' OR email = 'pdp.test@domain.com';`;

    const [tempUser] = await adminSql<{ id: string }[]>`
      INSERT INTO users (google_sub, email, role, status)
      VALUES ('pdp-test-sub-999', 'pdp.test@domain.com', 'owner', 'active')
      RETURNING id;
    `;

    const [tempOwner] = await adminSql<{ id: string }[]>`
      INSERT INTO owners (user_id, business_name, business_type)
      VALUES (${tempUser.id}, 'Toko Hapus PDP', 'jasa')
      RETURNING id;
    `;

    await adminSql`
      INSERT INTO channel_connections (owner_id, channel, external_account_id)
      VALUES (${tempOwner.id}, 'whatsapp', '628999888777');
    `;
    await adminSql`
      INSERT INTO bot_configs (owner_id, persona_prompt)
      VALUES (${tempOwner.id}, 'Bot to be deleted');
    `;
    await adminSql`
      INSERT INTO knowledge_base (owner_id, title, content)
      VALUES (${tempOwner.id}, 'Private FAQ', 'Secret information');
    `;

    // 2. Perform UU PDP erasure
    await adminSql`SELECT delete_owner_data(${tempOwner.id});`;

    // 3. Verify complete erasure across all tables
    const checkOwner = await adminSql`SELECT * FROM owners WHERE id = ${tempOwner.id};`;
    expect(checkOwner.length).toBe(0);

    const checkUser = await adminSql`SELECT * FROM users WHERE id = ${tempUser.id};`;
    expect(checkUser.length).toBe(0);

    const checkChannels = await adminSql`SELECT * FROM channel_connections WHERE owner_id = ${tempOwner.id};`;
    expect(checkChannels.length).toBe(0);

    const checkBot = await adminSql`SELECT * FROM bot_configs WHERE owner_id = ${tempOwner.id};`;
    expect(checkBot.length).toBe(0);

    const checkKb = await adminSql`SELECT * FROM knowledge_base WHERE owner_id = ${tempOwner.id};`;
    expect(checkKb.length).toBe(0);
  });
});
