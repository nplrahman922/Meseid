import { describe, it, expect, beforeAll } from "bun:test";
import {
  adminSql,
  appSql,
  withOwnerContext,
  withAdminContext,
  withSystemContext,
  runMaintenanceProcedure,
} from "../../src/db/client";
import { runSeed, SEED_IDS } from "../../src/db/seed";

describe("FOLLOW-UP 2: Security Definer Guards, Billing, Erasure, Ledger & Procedures", () => {
  let adminUser: { id: string };
  let ownerA: { id: string; user_id: string };
  let ownerB: { id: string; user_id: string };

  beforeAll(async () => {
    await runSeed();

    const [a] = await adminSql<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${SEED_IDS.ADMIN_USER};
    `;
    adminUser = a;

    const [oa] = await adminSql<{ id: string; user_id: string }[]>`
      SELECT id, user_id FROM owners WHERE id = ${SEED_IDS.OWNER_A_ID};
    `;
    ownerA = oa;

    const [ob] = await adminSql<{ id: string; user_id: string }[]>`
      SELECT id, user_id FROM owners WHERE id = ${SEED_IDS.OWNER_B_ID};
    `;
    ownerB = ob;
  });

  // ==========================================================================
  // 1. DEFINER GUARDS (Requirement 1)
  // ==========================================================================
  describe("1. DEFINER Guards on Sensitive Functions", () => {
    it("owner_ctx gets permission denied for function on fn_activate_subscription", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          await tx`SELECT fn_activate_subscription('ORDER-FAKE-001');`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied.*(function|fn_activate_subscription)/i);
      }
      expect(threw).toBe(true);
    });

    it("owner_ctx gets permission denied for function on fn_suspend_owner", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          await tx`SELECT fn_suspend_owner(${ownerB.id}, 'Malicious suspend attempt');`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied.*(function|fn_suspend_owner)/i);
      }
      expect(threw).toBe(true);
    });

    it("system_ctx cannot call fn_suspend_owner", async () => {
      let threw = false;
      try {
        await withSystemContext(async (tx) => {
          await tx`SELECT fn_suspend_owner(${ownerB.id}, 'System suspend attempt');`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied.*(function|fn_suspend_owner)/i);
      }
      expect(threw).toBe(true);
    });
  });

  // ==========================================================================
  // 2. ADMIN AUDIT LOG MUTATION GUARDS (Requirement 2)
  // ==========================================================================
  describe("2. admin_audit_log Append-Only & Mutation Restrictions", () => {
    it("admin_ctx UPDATE on admin_audit_log fails, including setting target_owner_id = NULL", async () => {
      // 1. Insert an audit row via admin context
      await withAdminContext(adminUser.id, async (tx) => {
        await tx`
          INSERT INTO admin_audit_log (admin_id, target_owner_id, action, reason)
          VALUES (${adminUser.id}, ${ownerA.id}, 'TEST_AUDIT', 'Initial audit record');
        `;
      });

      // 2. Attempt UPDATE ... SET target_owner_id = NULL, reason = 'x'
      let threwUpdateNull = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`
            UPDATE admin_audit_log
            SET target_owner_id = NULL, reason = 'Tampered reason'
            WHERE action = 'TEST_AUDIT';
          `;
        });
      } catch (err: any) {
        threwUpdateNull = true;
        expect(err.message).toMatch(/(permission denied for table admin_audit_log|admin_audit_log is append-only)/i);
      }
      expect(threwUpdateNull).toBe(true);

      // 3. Attempt generic DELETE
      let threwDelete = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`DELETE FROM admin_audit_log WHERE action = 'TEST_AUDIT';`;
        });
      } catch (err: any) {
        threwDelete = true;
        expect(err.message).toMatch(/(permission denied for table admin_audit_log|admin_audit_log is append-only)/i);
      }
      expect(threwDelete).toBe(true);
    });
  });

  // ==========================================================================
  // 3. fn_consume_quota STATUS, QUOTA_MODE & TIMEZONE (Requirement 3)
  // ==========================================================================
  describe("3. fn_consume_quota Plan Status, Mode & Timezone", () => {
    it("expired Pro subscription falls back to Gratis plan limits", async () => {
      const rand = Math.random().toString(36).substring(2, 9);
      const [u] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES (${'sub-exp-' + rand}, ${'exp-' + rand + '@test.id'}, 'owner', 'active')
        RETURNING id;
      `;
      const [o] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type, timezone)
        VALUES (${u.id}, 'Expired Pro UMKM', 'kuliner', 'Asia/Jakarta')
        RETURNING id;
      `;

      const [proPlan] = await adminSql<{ id: string }[]>`
        SELECT id FROM plans WHERE name = 'pro';
      `;

      // Set subscription expired 1 hour ago
      await adminSql`
        INSERT INTO subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
        VALUES (${o.id}, ${proPlan.id}, 'active', now() - interval '31 days', now() - interval '1 hour');
      `;

      // Should fall back to Gratis: 10,000 daily limit
      await withOwnerContext(o.id, u.id, async (tx) => {
        // Request 6,000 tokens (allowed)
        const [r1] = await tx<{ allowed: boolean; remaining: string }[]>`
          SELECT allowed, remaining FROM fn_consume_quota(${o.id}, 6000);
        `;
        expect(r1.allowed).toBe(true);
        expect(parseInt(r1.remaining, 10)).toBe(4000);

        // Request 5,000 tokens (exceeds remaining 4,000 of Gratis daily limit)
        const [r2] = await tx<{ allowed: boolean; remaining: string; message: string }[]>`
          SELECT allowed, remaining, message FROM fn_consume_quota(${o.id}, 5000);
        `;
        expect(r2.allowed).toBe(false);
        expect(r2.message).toMatch(/daily free quota exceeded/i);
      });
    });

    it("Pro plan row with default limits still uses monthly mode", async () => {
      const [p] = await adminSql<{ quota_mode: string }[]>`
        SELECT quota_mode FROM plans WHERE name = 'pro';
      `;
      expect(p.quota_mode).toBe("monthly");

      // Owner A is active Pro. Consuming quota uses period_type = 'month'
      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        const [res] = await tx<{ allowed: boolean }[]>`
          SELECT allowed FROM fn_consume_quota(${ownerA.id}, 100);
        `;
        expect(res.allowed).toBe(true);
      });

      const [counter] = await adminSql<{ period_type: string }[]>`
        SELECT period_type FROM quota_counters
        WHERE owner_id = ${ownerA.id} AND period_type = 'month';
      `;
      expect(counter.period_type).toBe("month");
    });

    it("day boundary period key is calculated according to owners.timezone (Asia/Jakarta)", async () => {
      const rand = Math.random().toString(36).substring(2, 9);
      const [u] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES (${'sub-tz-' + rand}, ${'tz-' + rand + '@test.id'}, 'owner', 'active')
        RETURNING id;
      `;
      const [o] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type, timezone)
        VALUES (${u.id}, 'Timezone Test UMKM', 'jasa', 'Asia/Jakarta')
        RETURNING id;
      `;

      await withOwnerContext(o.id, u.id, async (tx) => {
        await tx`SELECT fn_consume_quota(${o.id}, 500);`;
      });

      const [expectedKeyRow] = await adminSql<{ expected_key: string }[]>`
        SELECT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS expected_key;
      `;

      const [counter] = await adminSql<{ period_key: string }[]>`
        SELECT period_key FROM quota_counters
        WHERE owner_id = ${o.id} AND period_type = 'day';
      `;
      expect(counter.period_key).toBe(expectedKeyRow.expected_key);
    });
  });

  // ==========================================================================
  // 4. fn_activate_subscription VALIDATION & ROUTING (Requirement 4)
  // ==========================================================================
  describe("4. fn_activate_subscription Billing Integrity", () => {
    it("top-up order does not activate Pro subscription; routes to token_topups", async () => {
      const rand = Math.random().toString(36).substring(2, 9);
      const [u] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES (${'sub-topup-' + rand}, ${'topup-' + rand + '@test.id'}, 'owner', 'active')
        RETURNING id;
      `;
      const [o] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type)
        VALUES (${u.id}, 'Topup UMKM', 'kuliner')
        RETURNING id;
      `;

      const topupOrderId = 'ORDER-TOPUP-' + rand;
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${o.id}, ${topupOrderId}, 'topup', 20000.00, 'settlement', true, '{"package": "standard_topup"}'::jsonb);
      `;

      const [actRes] = await withSystemContext(async (tx) => {
        return tx<{ fn_activate_subscription: { status: string; product_type: string; tokens: number } }[]>`
          SELECT fn_activate_subscription(${topupOrderId});
        `;
      });

      expect(actRes.fn_activate_subscription.status).toBe("activated");
      expect(actRes.fn_activate_subscription.product_type).toBe("topup");
      expect(actRes.fn_activate_subscription.tokens).toBe(100000);

      // Verify no Pro subscription was created
      const subs = await adminSql<{ id: string }[]>`
        SELECT id FROM subscriptions WHERE owner_id = ${o.id};
      `;
      expect(subs.length).toBe(0);

      // Verify token_topups has 100,000 tokens
      const [topup] = await adminSql<{ tokens_purchased: string; tokens_remaining: string }[]>`
        SELECT tokens_purchased, tokens_remaining FROM token_topups WHERE owner_id = ${o.id};
      `;
      expect(parseInt(topup.tokens_purchased, 10)).toBe(100000);
      expect(parseInt(topup.tokens_remaining, 10)).toBe(100000);
    });

    it("wrong amount is rejected", async () => {
      const orderId = "ORDER-WRONG-AMT-" + Math.random().toString(36).substring(2, 9);
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${ownerB.id}, ${orderId}, 'subscription', 10000.00, 'settlement', true, '{"plan": "pro"}'::jsonb);
      `;

      let threw = false;
      try {
        await withSystemContext(async (tx) => {
          await tx`SELECT fn_activate_subscription(${orderId});`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/gross_amount.*does not match expected plan price/i);
      }
      expect(threw).toBe(true);
    });

    it("unverified signature is rejected", async () => {
      const orderId = "ORDER-UNVERIFIED-" + Math.random().toString(36).substring(2, 9);
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${ownerB.id}, ${orderId}, 'subscription', 49000.00, 'settlement', false, '{"plan": "pro"}'::jsonb);
      `;

      let threw = false;
      try {
        await withSystemContext(async (tx) => {
          await tx`SELECT fn_activate_subscription(${orderId});`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/signature not verified/i);
      }
      expect(threw).toBe(true);
    });

    it("yearly subscription adds 365 days and verifies amount (Rp 490.000)", async () => {
      const orderId = "ORDER-YEARLY-" + Math.random().toString(36).substring(2, 9);
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${ownerB.id}, ${orderId}, 'subscription', 490000.00, 'settlement', true, '{"plan": "pro", "billing_period": "yearly"}'::jsonb);
      `;

      const [res] = await withSystemContext(async (tx) => {
        return tx<{ fn_activate_subscription: { status: string; period: string } }[]>`
          SELECT fn_activate_subscription(${orderId});
        `;
      });
      expect(res.fn_activate_subscription.status).toBe("activated");
      expect(res.fn_activate_subscription.period).toBe("yearly");

      const [sub] = await adminSql<{ current_period_end: Date }[]>`
        SELECT current_period_end FROM subscriptions WHERE owner_id = ${ownerB.id};
      `;
      const diffDays = (new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 86400);
      expect(diffDays).toBeGreaterThan(360);
    });

    it("repeated webhook stays idempotent", async () => {
      const orderId = "ORDER-IDEMPOTENT-" + Math.random().toString(36).substring(2, 9);
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${ownerB.id}, ${orderId}, 'subscription', 49000.00, 'settlement', true, '{"plan": "pro"}'::jsonb);
      `;

      // 1st call
      await withSystemContext(async (tx) => {
        await tx`SELECT fn_activate_subscription(${orderId});`;
      });

      // 2nd call (repeated webhook)
      const [repeatRes] = await withSystemContext(async (tx) => {
        return tx<{ fn_activate_subscription: { status: string } }[]>`
          SELECT fn_activate_subscription(${orderId});
        `;
      });
      expect(repeatRes.fn_activate_subscription.status).toBe("already_processed");
    });
  });

  // ==========================================================================
  // 5. ERASURE & AUDIT LOG DESTRUCTION (Requirement 5)
  // ==========================================================================
  describe("5. Complete Tenant Erasure across Core Ledgers, Subledgers & Audit Logs", () => {
    it("Erasing a tenant with posted journals, subledgers, tokens, schedules, bookings & payments removes all rows", async () => {
      const rand = Math.random().toString(36).substring(2, 9);
      const [u] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES (${'sub-erase-full-' + rand}, ${'erase-full-' + rand + '@test.id'}, 'owner', 'active')
        RETURNING id;
      `;
      const [o] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type)
        VALUES (${u.id}, 'Tenant to Erase Fully', 'kuliner')
        RETURNING id;
      `;
      const targetId = o.id;

      // 1. Fetch default accounts
      const accounts = await adminSql<{ id: string; code: string }[]>`
        SELECT id, code FROM accounts WHERE owner_id = ${targetId};
      `;
      const kas = accounts.find((a) => a.code === "1101")!.id;
      const modal = accounts.find((a) => a.code === "3101")!.id;
      const piutang = accounts.find((a) => a.code === "1103")!.id;
      const pendapatan = accounts.find((a) => a.code === "4101")!.id;

      // 2. Insert party
      const [p] = await adminSql<{ id: string }[]>`
        INSERT INTO parties (owner_id, name, type)
        VALUES (${targetId}, 'Customer to Erase', 'customer')
        RETURNING id;
      `;

      // 3. Post journal with linked subledger (buku_pembantu)
      let journalId = "";
      await withOwnerContext(targetId, u.id, async (tx) => {
        const [jid] = await tx<{ fn_post_journal: string }[]>`
          SELECT fn_post_journal(
            ${targetId}::uuid,
            ${tx.json({ tx_date: "2026-10-15", description: "Penjualan kredit", source: "manual" })},
            ${tx.json([
              { account_id: piutang, debit: 500000, credit: 0, party_id: p.id, due_date: "2026-10-30" },
              { account_id: pendapatan, debit: 0, credit: 500000 },
            ])}
          );
        `;
        journalId = jid.fn_post_journal;
      });

      // 4. Token usage, quota counter, topup, schedule, booking, payment
      await adminSql`
        INSERT INTO token_usage_logs (owner_id, request_id, model, feature, input_tokens, output_tokens, status)
        VALUES (${targetId}, ${'req-erase-' + rand}, 'gemini-1.5-flash', 'chat', 100, 50, 'ok');
      `;
      await adminSql`
        INSERT INTO quota_counters (owner_id, period_type, period_key, tokens_used)
        VALUES (${targetId}, 'day', '2026-10-15', 500);
      `;
      await adminSql`
        INSERT INTO token_topups (owner_id, tokens_purchased, tokens_remaining, status)
        VALUES (${targetId}, 10000, 10000, 'active');
      `;
      const [sched] = await adminSql<{ id: string }[]>`
        INSERT INTO schedules (owner_id, title, start_at, end_at, status, source)
        VALUES (${targetId}, 'Jadwal VIP', now(), now() + interval '1 hour', 'confirmed', 'booking')
        RETURNING id;
      `;
      await adminSql`
        INSERT INTO bookings (owner_id, schedule_id, customer_name, customer_phone, service_name, requested_start_at, requested_end_at)
        VALUES (${targetId}, ${sched.id}, 'Pelanggan Rahasia', '08123456789', 'Layanan VIP', now(), now() + interval '1 hour');
      `;
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status)
        VALUES (${targetId}, ${'PAY-ERASE-' + rand}, 'subscription', 150000.00, 'settlement');
      `;

      // 5. Verify audit_log captured records with financial details
      const auditRows = await adminSql<{ id: string; details: any }[]>`
        SELECT id, details FROM audit_log WHERE owner_id = ${targetId};
      `;
      expect(auditRows.length).toBeGreaterThan(0);

      // Collect tracked row IDs to ensure no rows become NULL via ON DELETE SET NULL
      const trackedRowIds = new Map<string, string[]>();
      const tablesToCheck = [
        "owners", "users", "accounts", "parties", "jurnal_umum", "jurnal_baris",
        "buku_pembantu", "audit_log", "token_usage_logs", "quota_counters",
        "token_topups", "schedules", "bookings", "payment_history"
      ];

      for (const tbl of tablesToCheck) {
        const rows = await adminSql<{ id: string }[]>`
          SELECT id FROM ${adminSql(tbl)} 
          WHERE ${tbl === 'owners' ? adminSql`id = ${targetId}` : tbl === 'users' ? adminSql`id = ${u.id}` : adminSql`owner_id = ${targetId}`};
        `;
        trackedRowIds.set(tbl, rows.map((r) => r.id));
      }

      // 6. Execute delete_owner_data as the owner
      await withOwnerContext(targetId, u.id, async (tx) => {
        await tx`SELECT delete_owner_data(${targetId});`;
      });

      // 7. Assert that every tracked row ID is permanently erased (not lingering with owner_id = NULL)
      for (const [tbl, ids] of trackedRowIds.entries()) {
        if (ids.length > 0) {
          const remainingRows = await adminSql<{ id: string }[]>`
            SELECT id FROM ${adminSql(tbl)} WHERE id IN ${adminSql(ids)};
          `;
          expect(remainingRows.length).toBe(0);
        }
      }

      // 8. Assert generic zero-row check across all public tables with owner_id
      const allOwnerTables = await adminSql<{ table_name: string }[]>`
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'owner_id'
        ORDER BY table_name;
      `;

      for (const row of allOwnerTables) {
        const countRes = await adminSql<{ count: string }[]>`
          SELECT COUNT(*)::text as count
          FROM ${adminSql(row.table_name)}
          WHERE owner_id = ${targetId};
        `;
        expect(parseInt(countRes[0].count, 10)).toBe(0);
      }
    });
  });

  // ==========================================================================
  // 6. PROCEDURES (Requirement 6)
  // ==========================================================================
  describe("6. Stored Procedures & Transaction Boundary Rules", () => {
    it("sp_purge_old_logs fails inside a transaction block (withContext) due to internal COMMIT", async () => {
      let threw = false;
      try {
        await withSystemContext(async (tx) => {
          await tx`CALL sp_purge_old_logs(30);`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/(invalid transaction termination|cannot commit while a subtransaction is active)/i);
      }
      expect(threw).toBe(true);
    });

    it("sp_purge_old_logs succeeds when executed outside a transaction block (runMaintenanceProcedure)", async () => {
      // Seed old system_logs, chat_logs, and inbound_messages
      const oldDate = new Date(Date.now() - 40 * 86400000);
      const [oldLog] = await adminSql<{ id: string }[]>`
        INSERT INTO system_logs (level, component, code, message, created_at)
        VALUES ('warn', 'test', 'OLD_LOG_TEST', 'Old message to purge', ${oldDate})
        RETURNING id;
      `;
      const [freshLog] = await adminSql<{ id: string }[]>`
        INSERT INTO system_logs (level, component, code, message)
        VALUES ('info', 'test', 'FRESH_LOG_TEST', 'Fresh message')
        RETURNING id;
      `;

      // Run outside transaction via typed runMaintenanceProcedure
      await runMaintenanceProcedure({ procedure: "sp_purge_old_logs", args: [30] });

      const checkOld = await adminSql`SELECT id FROM system_logs WHERE id = ${oldLog.id};`;
      expect(checkOld.length).toBe(0);

      const checkFresh = await adminSql`SELECT id FROM system_logs WHERE id = ${freshLog.id};`;
      expect(checkFresh.length).toBe(1);

      // Verify unpermitted procedure is rejected
      let threw = false;
      try {
        await runMaintenanceProcedure({ procedure: "unauthorized_proc" as any });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/procedure not permitted/i);
      }
      expect(threw).toBe(true);
    });

    it("sp_expire_pending_actions: expires actions past expires_at timestamp", async () => {
      const [action] = await adminSql<{ id: string }[]>`
        INSERT INTO pending_actions (owner_id, type, payload, expires_at)
        VALUES (${ownerA.id}, 'test_expire', '{}'::jsonb, now() - interval '5 minutes')
        RETURNING id;
      `;

      await runMaintenanceProcedure({ procedure: "sp_expire_pending_actions" });

      const [res] = await adminSql<{ status: string }[]>`
        SELECT status FROM pending_actions WHERE id = ${action.id};
      `;
      expect(res.status).toBe("expired");
    });
  });

  // ==========================================================================
  // 7. fn_reverse_journal & SUBLEDGER RULES (Requirement 7)
  // ==========================================================================
  describe("7. fn_reverse_journal & Subledger Voiding", () => {
    it("voids linked buku_pembantu when reversing an unsettled journal", async () => {
      const accounts = await adminSql<{ id: string; code: string }[]>`
        SELECT id, code FROM accounts WHERE owner_id = ${ownerA.id};
      `;
      const piutang = accounts.find((a) => a.code === "1103")!.id;
      const pendapatan = accounts.find((a) => a.code === "4101")!.id;

      const [p] = await adminSql<{ id: string }[]>`
        SELECT id FROM parties WHERE owner_id = ${ownerA.id} LIMIT 1;
      `;

      let targetJid = "";
      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        const [res] = await tx<{ fn_post_journal: string }[]>`
          SELECT fn_post_journal(
            ${ownerA.id}::uuid,
            ${tx.json({ tx_date: "2026-10-16", description: "Penjualan untuk dibatalkan", source: "manual" })},
            ${tx.json([
              { account_id: piutang, debit: 200000, credit: 0, party_id: p.id, due_date: "2026-10-25" },
              { account_id: pendapatan, debit: 0, credit: 200000 },
            ])}
          );
        `;
        targetJid = res.fn_post_journal;
      });

      // Verify subledger created with status 'unpaid'
      const [subledgerBefore] = await adminSql<{ status: string }[]>`
        SELECT bp.status FROM buku_pembantu bp
        JOIN jurnal_baris jb ON jb.id = bp.journal_line_id
        WHERE jb.journal_id = ${targetJid};
      `;
      expect(subledgerBefore.status).toBe("unpaid");

      // Reverse journal
      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        await tx`SELECT fn_reverse_journal(${ownerA.id}, ${targetJid}, 'Salah input piutang');`;
      });

      // Verify subledger status changed to 'voided'
      const [subledgerAfter] = await adminSql<{ status: string }[]>`
        SELECT bp.status FROM buku_pembantu bp
        JOIN jurnal_baris jb ON jb.id = bp.journal_line_id
        WHERE jb.journal_id = ${targetJid};
      `;
      expect(subledgerAfter.status).toBe("voided");
    });

    it("rejects reversing a journal with partially or fully settled subledger", async () => {
      const accounts = await adminSql<{ id: string; code: string }[]>`
        SELECT id, code FROM accounts WHERE owner_id = ${ownerA.id};
      `;
      const piutang = accounts.find((a) => a.code === "1103")!.id;
      const pendapatan = accounts.find((a) => a.code === "4101")!.id;
      const [p] = await adminSql<{ id: string }[]>`
        SELECT id FROM parties WHERE owner_id = ${ownerA.id} LIMIT 1;
      `;

      let targetJid = "";
      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        const [res] = await tx<{ fn_post_journal: string }[]>`
          SELECT fn_post_journal(
            ${ownerA.id}::uuid,
            ${tx.json({ tx_date: "2026-10-16", description: "Penjualan parsial bayar", source: "manual" })},
            ${tx.json([
              { account_id: piutang, debit: 500000, credit: 0, party_id: p.id, due_date: "2026-10-25" },
              { account_id: pendapatan, debit: 0, credit: 500000 },
            ])}
          );
        `;
        targetJid = res.fn_post_journal;
      });

      // Simulate partial settlement of 100,000
      await adminSql`
        UPDATE buku_pembantu
        SET settled_amount = 100000.00, status = 'partially_paid'
        WHERE journal_line_id IN (SELECT id FROM jurnal_baris WHERE journal_id = ${targetJid});
      `;

      // Reversal must be rejected
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          await tx`SELECT fn_reverse_journal(${ownerA.id}, ${targetJid}, 'Coba reversal saat sudah bayar');`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/partially or fully settled subledger/i);
      }
      expect(threw).toBe(true);
    });

    it("unique partial index enforces single reversal; concurrent double-reversal fails for one caller", async () => {
      const accounts = await adminSql<{ id: string; code: string }[]>`
        SELECT id, code FROM accounts WHERE owner_id = ${ownerA.id};
      `;
      const kas = accounts.find((a) => a.code === "1101")!.id;
      const modal = accounts.find((a) => a.code === "3101")!.id;

      let targetJid = "";
      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        const [res] = await tx<{ fn_post_journal: string }[]>`
          SELECT fn_post_journal(
            ${ownerA.id}::uuid,
            ${tx.json({ tx_date: "2026-10-16", description: "Jurnal modal ganda", source: "manual" })},
            ${tx.json([
              { account_id: kas, debit: 100000, credit: 0 },
              { account_id: modal, debit: 0, credit: 100000 },
            ])}
          );
        `;
        targetJid = res.fn_post_journal;
      });

      // Execute 2 concurrent reversals on the exact same journal
      const results = await Promise.allSettled([
        withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          return tx`SELECT fn_reverse_journal(${ownerA.id}, ${targetJid}, 'Rev 1');`;
        }),
        withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          return tx`SELECT fn_reverse_journal(${ownerA.id}, ${targetJid}, 'Rev 2');`;
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      const rejectedReason = (rejected[0] as PromiseRejectedResult).reason.message;
      expect(rejectedReason).toMatch(/(already been reversed|uq_jurnal_umum_reverses_journal_id|unique constraint)/i);
    });
  });

  // ==========================================================================
  // 8. NO CONTEXT ROLE HAS TRUNCATE (Requirement 8)
  // ==========================================================================
  describe("8. Absolute Prohibition of TRUNCATE Privilege across Context Roles", () => {
    it("generic check: no context role has TRUNCATE privilege on any user table in public", async () => {
      const tables = await adminSql<{ table_name: string }[]>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      const roles = ["meseid_owner_ctx", "meseid_admin_ctx", "meseid_system_ctx"];

      for (const t of tables) {
        for (const r of roles) {
          const [res] = await adminSql<{ has_truncate: boolean }[]>`
            SELECT has_table_privilege(${r}, ${'public.' + t.table_name}, 'TRUNCATE') AS has_truncate;
          `;
          expect(res.has_truncate).toBe(false);
        }
      }
    });
  });

  // ==========================================================================
  // 9. BILLING INTEGRITY (Requirement 9)
  // ==========================================================================
  describe("9. Billing Integrity: owner_ctx Direct Writes Prohibited", () => {
    it("owner_ctx cannot directly UPDATE quota_counters", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          await tx`
            UPDATE quota_counters SET tokens_used = 0 WHERE owner_id = ${ownerA.id};
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied for table quota_counters/i);
      }
      expect(threw).toBe(true);
    });

    it("owner_ctx cannot directly INSERT token_topups", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          await tx`
            INSERT INTO token_topups (owner_id, tokens_purchased, tokens_remaining, status)
            VALUES (${ownerA.id}, 999999, 999999, 'active');
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/permission denied for table token_topups/i);
      }
      expect(threw).toBe(true);
    });
  });

  // ==========================================================================
  // 10. SMALL INTEGRITY CHECKS (Requirement 10)
  // ==========================================================================
  describe("10. Small Ledger & Admin Validation Improvements", () => {
    it("fn_post_journal sets created_by from app_user_id()", async () => {
      const accounts = await adminSql<{ id: string; code: string }[]>`
        SELECT id, code FROM accounts WHERE owner_id = ${ownerA.id};
      `;
      const kas = accounts.find((a) => a.code === "1101")!.id;
      const modal = accounts.find((a) => a.code === "3101")!.id;

      let jid = "";
      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        const [res] = await tx<{ fn_post_journal: string }[]>`
          SELECT fn_post_journal(
            ${ownerA.id}::uuid,
            ${tx.json({ tx_date: "2026-10-17", description: "Created by verification", source: "manual" })},
            ${tx.json([
              { account_id: kas, debit: 50000, credit: 0 },
              { account_id: modal, debit: 0, credit: 50000 },
            ])}
          );
        `;
        jid = res.fn_post_journal;
      });

      const [j] = await adminSql<{ created_by: string }[]>`
        SELECT created_by FROM jurnal_umum WHERE id = ${jid};
      `;
      expect(j.created_by).toBe(ownerA.user_id);
    });

    it("fn_post_journal rejects a party_id that belongs to another owner", async () => {
      const accounts = await adminSql<{ id: string; code: string }[]>`
        SELECT id, code FROM accounts WHERE owner_id = ${ownerA.id};
      `;
      const piutang = accounts.find((a) => a.code === "1103")!.id;
      const pendapatan = accounts.find((a) => a.code === "4101")!.id;

      // Create a foreign party for owner B
      const [foreignParty] = await adminSql<{ id: string }[]>`
        INSERT INTO parties (owner_id, name, type)
        VALUES (${ownerB.id}, 'Foreign Customer', 'customer')
        RETURNING id;
      `;

      let threw = false;
      try {
        await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
          await tx`
            SELECT fn_post_journal(
              ${ownerA.id}::uuid,
              ${tx.json({ tx_date: "2026-10-17", description: "Cross party fraud attempt", source: "manual" })},
              ${tx.json([
                { account_id: piutang, debit: 100000, credit: 0, party_id: foreignParty.id },
                { account_id: pendapatan, debit: 0, credit: 100000 },
              ])}
            );
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/party.*does not belong to owner/i);
      }
      expect(threw).toBe(true);
    });

    it("fn_suspend_owner rejects non-active or non-admin user", async () => {
      // Create a suspended admin user
      const randAdmin = Math.random().toString(36).substring(2, 9);
      const [badAdmin] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES (${'sub-bad-admin-' + randAdmin}, ${'bad.admin.' + randAdmin + '@meseid.id'}, 'admin', 'suspended')
        RETURNING id;
      `;

      let threw = false;
      try {
        await withAdminContext(badAdmin.id, async (tx) => {
          await tx`SELECT fn_suspend_owner(${ownerB.id}, 'Attempt suspend by suspended admin');`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/not an active admin/i);
      }
      expect(threw).toBe(true);
    });

    it("fn_suspend_owner rejects non-existent owner", async () => {
      const fakeOwnerId = "00000000-0000-0000-0000-999999999999";
      let threw = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`SELECT fn_suspend_owner(${fakeOwnerId}, 'Suspend ghost owner');`;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/owner.*does not exist/i);
      }
      expect(threw).toBe(true);
    });

    it("3-argument overload fn_suspend_owner(uuid, uuid, text) does not exist", async () => {
      const procs = await adminSql`
        SELECT proname, pronargs FROM pg_proc WHERE proname = 'fn_suspend_owner';
      `;
      expect(procs.length).toBe(1);
      expect(procs[0].pronargs).toBe(2);
    });

    it("dynamic admin-denied test: admin cannot read any tenant content tables", async () => {
      const tenantTables = [
        "accounts", "parties", "jurnal_umum", "jurnal_baris", "buku_pembantu",
        "pending_actions", "google_connections", "channel_connections",
        "bot_configs", "knowledge_base", "documents", "document_versions",
        "schedules", "bookings", "reminders", "inbound_messages", "chat_logs",
        "unanswered_questions", "quota_counters", "token_topups"
      ];

      for (const table of tenantTables) {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM ${tx(table)} LIMIT 1;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(new RegExp(`permission denied for table ${table}`, "i"));
        }
        expect(threw).toBe(true);
      }

      // Check audit_log: Admin has SELECT permission
      await withAdminContext(adminUser.id, async (tx) => {
        const rows = await tx`SELECT id, action, table_name FROM audit_log LIMIT 5;`;
        expect(Array.isArray(rows)).toBe(true);
      });
    });

    it("an index with owner_id as leading column exists on EVERY owner-scoped table", async () => {
      const allOwnerTables = await adminSql<{ table_name: string }[]>`
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = 'public'
        WHERE c.table_schema = 'public'
          AND c.column_name = 'owner_id'
          AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name;
      `;

      const missingLeadingOwnerIndex: string[] = [];

      for (const { table_name } of allOwnerTables) {
        const indexes = await adminSql<{ index_name: string; leading_col: string }[]>`
          SELECT i.relname as index_name, a.attname as leading_col
          FROM pg_index x
          JOIN pg_class c ON c.oid = x.indrelid
          JOIN pg_class i ON i.oid = x.indexrelid
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = x.indkey[0]
          WHERE c.relname = ${table_name};
        `;
        const hasOwnerLeading = indexes.some((idx) => idx.leading_col === "owner_id");
        if (!hasOwnerLeading) {
          missingLeadingOwnerIndex.push(table_name);
        }
      }

      expect(missingLeadingOwnerIndex).toEqual([]);
    });

    it("subledger_aging excludes voided and paid subledger items", async () => {
      const accounts = await adminSql<{ id: string; code: string }[]>`
        SELECT id, code FROM accounts WHERE owner_id = ${ownerA.id};
      `;
      const piutang = accounts.find((a) => a.code === "1103")!.id;
      const pendapatan = accounts.find((a) => a.code === "4101")!.id;

      const [p] = await adminSql<{ id: string }[]>`
        INSERT INTO parties (owner_id, type, name)
        VALUES (${ownerA.id}, 'customer', 'Pelanggan Void Filter Test')
        RETURNING id;
      `;

      let subledgerId = "";
      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        await tx`
          SELECT fn_post_journal(
            ${ownerA.id},
            ${appSql.json({
              description: "Journal to void filter test",
              source: "manual",
            })},
            ${appSql.json([
              { account_id: piutang, debit: 250000, credit: 0, party_id: p.id, due_date: "2026-11-01" },
              { account_id: pendapatan, debit: 0, credit: 250000 },
            ])}
          );
        `;

        const [sub] = await tx<{ id: string }[]>`
          UPDATE buku_pembantu SET status = 'voided' WHERE party_id = ${p.id} RETURNING id;
        `;
        subledgerId = sub.id;
      });

      await withOwnerContext(ownerA.id, ownerA.user_id, async (tx) => {
        const rows = await tx<{ subledger_id: string }[]>`
          SELECT subledger_id FROM subledger_aging WHERE subledger_id = ${subledgerId};
        `;
        expect(rows.length).toBe(0);
      });
    });
  });
});
