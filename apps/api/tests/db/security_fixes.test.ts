import { describe, it, expect, beforeAll } from "bun:test";
import {
  adminSql,
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

describe("Security Fixes A through F & Tenant Data Protection Verification", () => {
  let userA: UserRow;
  let ownerA: OwnerRow;
  let userB: UserRow;
  let ownerB: OwnerRow;
  let adminUser: UserRow;

  beforeAll(async () => {
    await runSeed();

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
  // TEST SUITE 1: Cross-Tenant Spoofing Rejection
  // Owner A calling owner-scoped functions with Owner B's ID must fail.
  // --------------------------------------------------------------------------
  describe("1. Cross-Tenant ID Spoofing Rejection (Fix A)", () => {
    it("Owner A calling fn_post_journal with Owner B id must fail", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          // Look up an account belonging to owner B
          const [accB] = await adminSql<{ id: string }[]>`
            SELECT id FROM accounts WHERE owner_id = ${ownerB.id} LIMIT 1;
          `;
          const header = JSON.stringify({ description: "Malicious Journal", source: "manual" });
          const lines = JSON.stringify([
            { account_id: accB.id, debit: 50000, credit: 0 },
            { account_id: accB.id, debit: 0, credit: 50000 },
          ]);
          await tx`
            SELECT fn_post_journal(
              ${ownerB.id}::uuid,
              ${header}::jsonb,
              ${lines}::jsonb
            );
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/access denied|caller does not match owner_id|violates row-level security policy/i);
      }
      expect(threw).toBe(true);
    });

    it("Owner A calling fn_reverse_journal with Owner B id must fail", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`
            SELECT fn_reverse_journal(${ownerB.id}, '00000000-0000-0000-0000-000000000001'::uuid, 'Unauthorized reversal');
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/access denied|caller does not match owner_id/i);
      }
      expect(threw).toBe(true);
    });

    it("Owner A calling fn_confirm_pending_action on Owner B pending action must fail", async () => {
      // Create a pending action for Owner B
      const [actionB] = await adminSql<{ id: string }[]>`
        INSERT INTO pending_actions (owner_id, type, payload, expires_at)
        VALUES (${ownerB.id}, 'test_action', '{"action": "test"}'::jsonb, now() + interval '10 minutes')
        RETURNING id;
      `;

      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`SELECT fn_confirm_pending_action(${actionB.id});`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/pending action .* not found|access denied/i);
      }
      expect(threw).toBe(true);

      // Cleanup
      await adminSql`DELETE FROM pending_actions WHERE id = ${actionB.id};`;
    });

    it("Owner A calling fn_consume_quota with Owner B id must fail", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`SELECT * FROM fn_consume_quota(${ownerB.id}, 100);`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/access denied: caller does not match owner_id/i);
      }
      expect(threw).toBe(true);
    });

    it("Owner A calling delete_owner_data with Owner B id must fail", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`SELECT delete_owner_data(${ownerB.id});`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied: owner can only erase their own data/i);
      }
      expect(threw).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 2: GUC Bypass Removal (Fix B)
  // Even with app.allow_pdp_purge = 'on', owner_ctx cannot delete/update posted journals.
  // --------------------------------------------------------------------------
  describe("2. GUC Bypass Removal from Journal Mutation Trigger (Fix B)", () => {
    it("As owner_ctx, set_config('app.allow_pdp_purge','on',true) then DELETE/UPDATE on posted journal must still fail", async () => {
      // 1. Post a valid journal for Owner A
      let journalId: string = "";
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const accounts = await tx<{ id: string; type: string }[]>`
          SELECT id, type FROM accounts WHERE owner_id = ${ownerA.id} AND code IN ('1101', '4101');
        `;
        const kas = accounts.find((a) => a.type === "asset");
        const rev = accounts.find((a) => a.type === "revenue");

        const [j] = await tx<{ id: string }[]>`
          INSERT INTO jurnal_umum (owner_id, tx_date, description, source, kind)
          VALUES (${ownerA.id}, CURRENT_DATE, 'GUC Test Journal', 'manual', 'normal')
          RETURNING id;
        `;
        journalId = j.id;

        await tx`
          INSERT INTO jurnal_baris (journal_id, owner_id, account_id, debit, credit)
          VALUES 
            (${journalId}, ${ownerA.id}, ${kas!.id}, 25000, 0),
            (${journalId}, ${ownerA.id}, ${rev!.id}, 0, 25000);
        `;
      });

      // 2. Attempt to bypass immutability trigger via GUC as owner_ctx
      let deleteThrew = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`SELECT set_config('app.allow_pdp_purge', 'on', true);`;
          await tx`DELETE FROM jurnal_umum WHERE id = ${journalId};`;
        });
      } catch (err: any) {
        deleteThrew = true;
        expect(err.message).toMatch(/(permission denied for table jurnal_umum|immutable\. corrections must be made via a reversal journal)/i);
      }
      expect(deleteThrew).toBe(true);

      let updateThrew = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`SELECT set_config('app.allow_pdp_purge', 'on', true);`;
          await tx`UPDATE jurnal_umum SET description = 'Tampered' WHERE id = ${journalId};`;
        });
      } catch (err: any) {
        updateThrew = true;
        expect(err.message).toMatch(/(permission denied for table jurnal_umum|immutable\. corrections must be made via a reversal journal)/i);
      }
      expect(updateThrew).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Admin Boundaries (Fix A & C)
  // admin_ctx cannot execute delete_owner_data or read any content table.
  // --------------------------------------------------------------------------
  describe("3. Admin Least-Privilege & Boundary Enforcement (Fix A & C)", () => {
    it("admin_ctx cannot execute delete_owner_data", async () => {
      let threw = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`SELECT delete_owner_data(${ownerB.id});`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied.*delete_owner_data/i);
      }
      expect(threw).toBe(true);
    });

    const contentTables = [
      "jurnal_umum",
      "jurnal_baris",
      "accounts",
      "parties",
      "buku_pembantu",
      "pending_actions",
      "google_connections",
      "bot_configs",
      "knowledge_base",
      "documents",
      "document_versions",
      "schedules",
      "bookings",
      "reminders",
      "inbound_messages",
      "chat_logs",
      "unanswered_questions",
    ];

    for (const table of contentTables) {
      it(`admin_ctx is denied read access to content table '${table}'`, async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx.unsafe(`SELECT * FROM ${table} LIMIT 1;`);
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(new RegExp(`permission denied for table ${table}`, "i"));
        }
        expect(threw).toBe(true);
      });
    }
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Erasing Suspended Owner with Admin Audit Log Rows (Fix C)
  // --------------------------------------------------------------------------
  describe("4. Erasing Suspended Owner with Audit Trail (Fix C)", () => {
    it("Erasing an owner that was previously suspended (has admin_audit_log rows) succeeds", async () => {
      // 1. Create a dummy tenant to suspend and then erase
      const [tempUser] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES ('suspended-test-sub-001', 'suspended.owner@test.id', 'owner', 'active')
        RETURNING id;
      `;

      const [tempOwner] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type)
        VALUES (${tempUser.id}, 'Toko Suspended Test', 'toko')
        RETURNING id;
      `;

      // 2. Suspend the owner via admin action (creates admin_audit_log entry)
      await withAdminContext(adminUser.id, async (tx) => {
        await tx`SELECT fn_suspend_owner(${tempOwner.id}, 'Suspended for testing deletion');`;
      });

      // Verify admin_audit_log entry exists
      const auditRows = await adminSql`
        SELECT id FROM admin_audit_log WHERE target_owner_id = ${tempOwner.id};
      `;
      expect(auditRows.length).toBeGreaterThan(0);

      // 3. Perform erasure as system_ctx
      await withSystemContext(async (tx) => {
        await tx`SELECT delete_owner_data(${tempOwner.id});`;
      });

      // 4. Verify owner and user are completely gone
      const checkOwner = await adminSql`SELECT id FROM owners WHERE id = ${tempOwner.id};`;
      expect(checkOwner.length).toBe(0);

      const checkUser = await adminSql`SELECT id FROM users WHERE id = ${tempUser.id};`;
      expect(checkUser.length).toBe(0);

      // 5. Verify admin_audit_log still retains historical record without FK block
      const auditAfter = await adminSql`
        SELECT id, action, reason FROM admin_audit_log WHERE target_owner_id = ${tempOwner.id};
      `;
      expect(auditAfter.length).toBeGreaterThan(0);
      expect(auditAfter[0].action).toBe("SUSPEND_OWNER");
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Complete Zero-Row Erasure Verification (Generic information_schema)
  // --------------------------------------------------------------------------
  describe("5. Zero-Row Guarantee across All owner_id Tables (Fix C)", () => {
    it("After delete_owner_data, every table that has an owner_id column has zero rows for that owner", async () => {
      // 1. Create a dummy tenant
      const [u] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES ('full-erasure-sub-001', 'full.erasure@test.id', 'owner', 'active')
        RETURNING id;
      `;

      const [o] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type)
        VALUES (${u.id}, 'Full Erasure UMKM', 'kuliner')
        RETURNING id;
      `;

      const targetId = o.id;

      // 2. Populate data across multiple owner-scoped tables
      await adminSql`
        INSERT INTO channel_connections (owner_id, channel, external_account_id)
        VALUES (${targetId}, 'whatsapp', '628999111222');
      `;
      await adminSql`
        INSERT INTO bot_configs (owner_id, persona_prompt)
        VALUES (${targetId}, 'Custom prompt');
      `;
      await adminSql`
        INSERT INTO knowledge_base (owner_id, category, title, content)
        VALUES (${targetId}, 'faq', 'Test Title', 'Test Content');
      `;
      await adminSql`
        INSERT INTO pending_actions (owner_id, type, payload, expires_at)
        VALUES (${targetId}, 'test', '{"data": 1}'::jsonb, now() + interval '5 minutes');
      `;
      await adminSql`
        INSERT INTO documents (owner_id, kind, title, drive_file_id)
        VALUES (${targetId}, 'laporan', 'Laporan Keuangan', 'drive-file-123');
      `;
      await adminSql`
        INSERT INTO inbound_messages (channel, external_message_id, owner_id, sender_id)
        VALUES ('whatsapp', 'msg-ext-001', ${targetId}, 'sender-001');
      `;
      await adminSql`
        INSERT INTO chat_logs (owner_id, channel, external_sender_id, summary)
        VALUES (${targetId}, 'whatsapp', 'sender-001', 'Summary of conversation');
      `;
      await adminSql`
        INSERT INTO unanswered_questions (owner_id, question_text)
        VALUES (${targetId}, 'What are your store hours?');
      `;

      // 3. Execute delete_owner_data as the owner themselves
      await withOwnerContext(targetId, u.id, async (tx) => {
        await tx`SELECT delete_owner_data(${targetId});`;
      });

      // 4. Query information_schema for all tables in 'public' schema that have an 'owner_id' column
      const tablesWithOwnerId = await adminSql<{ table_name: string }[]>`
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'owner_id'
          AND table_name NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_name;
      `;

      expect(tablesWithOwnerId.length).toBeGreaterThanOrEqual(15);

      // 5. Assert that every single table has 0 rows for targetId
      for (const row of tablesWithOwnerId) {
        const countRes = await adminSql<{ count: string }[]>`
          SELECT COUNT(*)::text as count
          FROM ${adminSql(row.table_name)}
          WHERE owner_id = ${targetId};
        `;
        const count = parseInt(countRes[0].count, 10);
        expect(count).toBe(0);
      }
    });
  });
});
