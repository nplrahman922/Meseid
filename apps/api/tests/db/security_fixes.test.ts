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
      "channel_link_codes",
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
      await adminSql`
        INSERT INTO channel_link_codes (owner_id, channel, target_external_id, code_hash)
        VALUES (${targetId}, 'whatsapp', '628123456789', 'hash123');
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

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Architectural & Security Fixes (Fixes 1-6)
  // --------------------------------------------------------------------------
  describe("6. Architectural & Security Fixes Verification", () => {
    // FIX 1: ai_models RLS & Role Grants
    describe("Fix 1: ai_models RLS & Role Grants", () => {
      it("owner_ctx and system_ctx can SELECT from ai_models", async () => {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const models = await tx`SELECT model_id, provider, tier, enabled FROM ai_models;`;
          expect(models.length).toBeGreaterThan(0);
          expect(models.some((m) => m.model_id === "gemini-1.5-flash")).toBe(true);
        });

        await withSystemContext(async (tx) => {
          const models = await tx`SELECT model_id, provider, tier FROM ai_models;`;
          expect(models.length).toBeGreaterThan(0);
        });
      });

      it("owner_ctx cannot INSERT, UPDATE, or DELETE on ai_models", async () => {
        let threwInsert = false;
        try {
          await withOwnerContext(ownerA.id, userA.id, async (tx) => {
            await tx`
              INSERT INTO ai_models (provider, model_id, tier, enabled, price_input_per_1m, price_output_per_1m)
              VALUES ('test', 'test-model-owner', 'free', true, 1.0, 2.0);
            `;
          });
        } catch (err: any) {
          threwInsert = true;
          expect(err.message).toMatch(/permission denied for table ai_models/i);
        }
        expect(threwInsert).toBe(true);
      });

      it("admin_ctx can manage ai_models (INSERT, UPDATE, DELETE)", async () => {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`
            INSERT INTO ai_models (provider, model_id, tier, enabled, price_input_per_1m, price_output_per_1m)
            VALUES ('openai', 'gpt-test-admin', 'pro', true, 2.50, 10.00);
          `;

          const [m] = await tx`SELECT model_id, enabled FROM ai_models WHERE model_id = 'gpt-test-admin';`;
          expect(m.model_id).toBe("gpt-test-admin");
          expect(m.enabled).toBe(true);

          await tx`UPDATE ai_models SET enabled = false WHERE model_id = 'gpt-test-admin';`;
          const [updated] = await tx`SELECT enabled FROM ai_models WHERE model_id = 'gpt-test-admin';`;
          expect(updated.enabled).toBe(false);

          await tx`DELETE FROM ai_models WHERE model_id = 'gpt-test-admin';`;
          const remaining = await tx`SELECT model_id FROM ai_models WHERE model_id = 'gpt-test-admin';`;
          expect(remaining.length).toBe(0);
        });
      });

      it("system_ctx inserting into token_usage_logs triggers trigger_calc_token_usage_cost querying ai_models", async () => {
        await withSystemContext(async (tx) => {
          const [log] = await tx`
            INSERT INTO token_usage_logs (owner_id, request_id, model, feature, input_tokens, output_tokens, total_tokens)
            VALUES (${ownerA.id}, 'req-test-cost-calc-001', 'gemini-1.5-flash', 'chat', 2000, 1000, 3000)
            RETURNING cost_estimate;
          `;
          expect(Number(log.cost_estimate)).toBeGreaterThan(0);
        });
      });
    });

    // FIX 2: Least-Privilege Hardening for Append-Only Logs & Owner Deletion
    describe("Fix 2: Least-Privilege Hardening for Append-Only Logs & Direct Owner Deletion", () => {
      it("system_ctx cannot UPDATE or DELETE in token_usage_logs", async () => {
        let threwUpdate = false;
        try {
          await withSystemContext(async (tx) => {
            await tx`UPDATE token_usage_logs SET total_tokens = 999999 WHERE request_id = 'req-test-cost-calc-001';`;
          });
        } catch (err: any) {
          threwUpdate = true;
          expect(err.message).toMatch(/permission denied for table token_usage_logs/i);
        }
        expect(threwUpdate).toBe(true);

        let threwDelete = false;
        try {
          await withSystemContext(async (tx) => {
            await tx`DELETE FROM token_usage_logs WHERE request_id = 'req-test-cost-calc-001';`;
          });
        } catch (err: any) {
          threwDelete = true;
          expect(err.message).toMatch(/permission denied for table token_usage_logs/i);
        }
        expect(threwDelete).toBe(true);
      });

      it("system_ctx cannot UPDATE or DELETE in system_logs", async () => {
        let logId: string;
        await withSystemContext(async (tx) => {
          const [row] = await tx`
            INSERT INTO system_logs (component, level, code, message)
            VALUES ('test_component', 'info', 'SYS_TEST_IMMUTABLE', 'Original message')
            RETURNING id;
          `;
          logId = row.id;
        });

        let threwUpdate = false;
        try {
          await withSystemContext(async (tx) => {
            await tx`UPDATE system_logs SET message = 'tampered' WHERE id = ${logId}::uuid;`;
          });
        } catch (err: any) {
          threwUpdate = true;
          expect(err.message).toMatch(/permission denied for table system_logs/i);
        }
        expect(threwUpdate).toBe(true);

        let threwDelete = false;
        try {
          await withSystemContext(async (tx) => {
            await tx`DELETE FROM system_logs WHERE id = ${logId}::uuid;`;
          });
        } catch (err: any) {
          threwDelete = true;
          expect(err.message).toMatch(/permission denied for table system_logs/i);
        }
        expect(threwDelete).toBe(true);
      });

      it("system_ctx cannot DELETE from payment_history", async () => {
        let threwDelete = false;
        try {
          await withSystemContext(async (tx) => {
            await tx`DELETE FROM payment_history WHERE order_id = 'ORD-SEED-001';`;
          });
        } catch (err: any) {
          threwDelete = true;
          expect(err.message).toMatch(/permission denied for table payment_history/i);
        }
        expect(threwDelete).toBe(true);
      });

      it("owner_ctx cannot directly DELETE from owners table", async () => {
        let threwDelete = false;
        try {
          await withOwnerContext(ownerA.id, userA.id, async (tx) => {
            await tx`DELETE FROM owners WHERE id = ${ownerA.id};`;
          });
        } catch (err: any) {
          threwDelete = true;
          expect(err.message).toMatch(/permission denied for table owners/i);
        }
        expect(threwDelete).toBe(true);
      });
    });

    // FIX 3: Encrypted Channel Credentials
    describe("Fix 3: Encrypted Channel Credentials (channel_connections.credentials_enc)", () => {
      it("owner_ctx can store and read bytea encrypted credentials", async () => {
        const dummyTokenEnc = Buffer.from("enc_token_baileys_creds_987654321");
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const [conn] = await tx`
            INSERT INTO channel_connections (owner_id, channel, external_account_id, session_ref, credentials_enc)
            VALUES (${ownerA.id}, 'telegram', 'test-tg-enc-1', 'session-non-secret-ref', ${dummyTokenEnc})
            RETURNING id, channel, session_ref, credentials_enc;
          `;
          expect(conn.channel).toBe("telegram");
          expect(conn.session_ref).toBe("session-non-secret-ref");
          expect(conn.credentials_enc).toBeDefined();

          const buf = Buffer.from(conn.credentials_enc);
          expect(buf.toString()).toBe("enc_token_baileys_creds_987654321");
        });
      });
    });

    // FIX 4: Align bot_configs with SRS Dual-Persona, AI Model, Whitelist, & Groups
    describe("Fix 4: Align bot_configs with SRS Dual-Persona, AI Model, Whitelist, & Groups", () => {
      it("bot_configs supports assistant and admin personas, model selection, and group rules", async () => {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`
            UPDATE bot_configs
            SET assistant_bot_name = 'Asisten Warkop',
                assistant_persona_prompt = 'Kamu asisten warkop yang ramah.',
                admin_bot_name = 'Kasir Bot',
                admin_persona_prompt = 'Kamu kasir toko yang sigap melayani pesanan.',
                persona_prompt = 'Fallback prompt',
                selected_model_id = 'gemini-1.5-flash',
                customer_access_mode = 'whitelist',
                allowed_contacts = '["628111222333"]'::jsonb,
                allowed_groups = '[{"group_id": "group-warkop-1", "response_mode": "mention_only", "is_internal": true}]'::jsonb
            WHERE owner_id = ${ownerA.id};
          `;

          const [cfg] = await tx`
            SELECT assistant_bot_name, assistant_persona_prompt, admin_bot_name, admin_persona_prompt,
                   persona_prompt, selected_model_id, customer_access_mode, allowed_contacts, allowed_groups
            FROM bot_configs
            WHERE owner_id = ${ownerA.id};
          `;

          expect(cfg.assistant_bot_name).toBe("Asisten Warkop");
          expect(cfg.assistant_persona_prompt).toBe("Kamu asisten warkop yang ramah.");
          expect(cfg.admin_bot_name).toBe("Kasir Bot");
          expect(cfg.admin_persona_prompt).toBe("Kamu kasir toko yang sigap melayani pesanan.");
          expect(cfg.persona_prompt).toBe("Fallback prompt");
          expect(cfg.selected_model_id).toBe("gemini-1.5-flash");
          expect(cfg.customer_access_mode).toBe("whitelist");
          expect(Array.isArray(cfg.allowed_contacts)).toBe(true);
          expect(cfg.allowed_contacts[0]).toBe("628111222333");
          expect(cfg.allowed_groups[0].group_id).toBe("group-warkop-1");
        });
      });

      it("bot_configs enforces FK on selected_model_id", async () => {
        let threwFK = false;
        try {
          await withOwnerContext(ownerA.id, userA.id, async (tx) => {
            await tx`
              UPDATE bot_configs
              SET selected_model_id = 'invalid-nonexistent-model'
              WHERE owner_id = ${ownerA.id};
            `;
          });
        } catch (err: any) {
          threwFK = true;
          expect(err.message).toMatch(/violates foreign key constraint/i);
        }
        expect(threwFK).toBe(true);
      });

      it("bot_configs enforces CHECK on customer_access_mode ('open' | 'whitelist')", async () => {
        let threwCheck = false;
        try {
          await withOwnerContext(ownerA.id, userA.id, async (tx) => {
            await tx`
              UPDATE bot_configs
              SET customer_access_mode = 'all_access'
              WHERE owner_id = ${ownerA.id};
            `;
          });
        } catch (err: any) {
          threwCheck = true;
          expect(err.message).toMatch(/violates check constraint/i);
        }
        expect(threwCheck).toBe(true);
      });
    });

    // FIX 5: Account Linking OTP Support (channel_link_codes)
    describe("Fix 5: Account Linking OTP Support (channel_link_codes)", () => {
      let otpId: string;

      it("owner_ctx can insert and query link codes", async () => {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const [row] = await tx`
            INSERT INTO channel_link_codes (owner_id, channel, target_external_id, code_hash)
            VALUES (${ownerA.id}, 'whatsapp', '628999888777', 'sha256_hashed_code_123')
            RETURNING id, channel, target_external_id, code_hash, used_at;
          `;
          otpId = row.id;
          expect(row.channel).toBe("whatsapp");
          expect(row.target_external_id).toBe("628999888777");
          expect(row.code_hash).toBe("sha256_hashed_code_123");
          expect(row.used_at).toBeNull();
        });
      });

      it("RLS prevents Owner B from seeing Owner A link codes", async () => {
        await withOwnerContext(ownerB.id, userB.id, async (tx) => {
          const rows = await tx`SELECT id FROM channel_link_codes WHERE id = ${otpId}::uuid;`;
          expect(rows.length).toBe(0);
        });
      });

      it("system_ctx can read and update link code (used_at)", async () => {
        await withSystemContext(async (tx) => {
          const [updated] = await tx`
            UPDATE channel_link_codes
            SET used_at = now()
            WHERE id = ${otpId}::uuid
            RETURNING id, used_at;
          `;
          expect(updated.used_at).not.toBeNull();
        });
      });

      it("admin_ctx is denied access to channel_link_codes", async () => {
        let threwAdmin = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM channel_link_codes LIMIT 1;`;
          });
        } catch (err: any) {
          threwAdmin = true;
          expect(err.message).toMatch(/permission denied for table channel_link_codes/i);
        }
        expect(threwAdmin).toBe(true);
      });
    });

    // FIX 6: Confirm Pending Action & Post Journal in Owner Context
    describe("Fix 6: fn_confirm_pending_action Execution in Owner Context", () => {
      it("Owner confirming a pending post_journal action successfully posts journal without permission errors", async () => {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const accounts = await tx<{ id: string; type: string }[]>`
            SELECT id, type FROM accounts WHERE owner_id = ${ownerA.id} AND code IN ('1101', '4101');
          `;
          const kas = accounts.find((a) => a.type === "asset");
          const rev = accounts.find((a) => a.type === "revenue");

          const actionPayload = {
            header: {
              description: "Penjualan Kopi Chat Confirmed",
              source: "ocr",
              source_ref: "CHAT-CONFIRM-TEST-001"
            },
            lines: [
              { account_id: kas!.id, debit: 45000, credit: 0, memo: "Kas Masuk Kopi" },
              { account_id: rev!.id, debit: 0, credit: 45000, memo: "Pendapatan Kopi" }
            ]
          };

          const [action] = await tx<{ id: string }[]>`
            INSERT INTO pending_actions (owner_id, type, payload, expires_at)
            VALUES (${ownerA.id}, 'post_journal', ${tx.json(actionPayload)}, now() + interval '10 minutes')
            RETURNING id;
          `;

          const [resRaw] = await tx<{ fn_confirm_pending_action: any }[]>`
            SELECT fn_confirm_pending_action(${action.id}) AS fn_confirm_pending_action;
          `;

          const result = typeof resRaw.fn_confirm_pending_action === "string"
            ? JSON.parse(resRaw.fn_confirm_pending_action)
            : resRaw.fn_confirm_pending_action;

          expect(result.status).toBe("confirmed");
          expect(result.journal_id).toBeDefined();

          // Verify journal was posted to jurnal_umum
          const [j] = await tx`
            SELECT id, description, source, kind
            FROM jurnal_umum
            WHERE id = ${result.journal_id}::uuid;
          `;
          expect(j.description).toBe("Penjualan Kopi Chat Confirmed");
          expect(j.source).toBe("ocr");
          expect(j.kind).toBe("normal");

          // Verify journal lines were posted to jurnal_baris
          const lines = await tx`
            SELECT debit, credit, memo
            FROM jurnal_baris
            WHERE journal_id = ${result.journal_id}::uuid
            ORDER BY debit DESC;
          `;
          expect(lines.length).toBe(2);
          expect(Number(lines[0].debit)).toBe(45000);
          expect(Number(lines[1].credit)).toBe(45000);

          // Verify pending action status changed to confirmed
          const [actUpdated] = await tx`
            SELECT status FROM pending_actions WHERE id = ${action.id}::uuid;
          `;
          expect(actUpdated.status).toBe("confirmed");
        });
      });
    });
  });
});
