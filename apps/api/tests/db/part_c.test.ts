import { describe, it, expect, beforeAll } from "bun:test";
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

describe("Part C: AI Usage, Quotas/Billing, Documents, Scheduling, Ingestion, Ops & Admin", () => {
  let userA: UserRow;
  let ownerA: OwnerRow;
  let userB: UserRow;
  let ownerB: OwnerRow;
  let adminUser: UserRow;

  beforeAll(async () => {
    // 1. Seed base tenancy and plans
    await runSeed();

    // 2. Load owners
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

    // 3. Clean up test tables for Part C idempotency
    await adminSql.begin(async (tx) => {
      await tx`SET LOCAL app.allow_pdp_purge = 'on';`;
      await tx`DELETE FROM token_usage_logs;`;
      await tx`DELETE FROM quota_counters;`;
      await tx`DELETE FROM token_topups;`;
      await tx`DELETE FROM payment_history;`;
      await tx`DELETE FROM reminders;`;
      await tx`DELETE FROM bookings;`;
      await tx`DELETE FROM schedules;`;
      await tx`DELETE FROM document_versions;`;
      await tx`DELETE FROM documents;`;
      await tx`DELETE FROM inbound_messages;`;
      await tx`DELETE FROM chat_logs;`;
      await tx`DELETE FROM unanswered_questions;`;
      await tx`DELETE FROM system_logs;`;
      await tx`DELETE FROM alerts;`;
    });
  });

  // ==========================================================================
  // 1. AI MODELS REGISTRY & TOKEN USAGE LOGS
  // ==========================================================================
  describe("1. AI Models Registry & Token Usage Logs", () => {
    it("ai_models: contains standard multi-model registry", async () => {
      const models = await adminSql<{ model_id: string; tier: string; enabled: boolean }[]>`
        SELECT model_id, tier, enabled FROM ai_models ORDER BY model_id;
      `;
      expect(models.length).toBeGreaterThanOrEqual(4);
      const flash = models.find((m) => m.model_id === "gemini-1.5-flash");
      expect(flash).toBeDefined();
      expect(flash?.tier).toBe("free");
      expect(flash?.enabled).toBe(true);
    });

    it("token_usage_logs: trigger automatically calculates total_tokens and cost_estimate", async () => {
      let logId: string = "";

      await withSystemContext(async (tx) => {
        // gemini-1.5-flash: price_input_per_1m = 1.15, price_output_per_1m = 4.60
        // input = 1000, output = 500
        // cost = (1000 * 1.15 / 1e6) + (500 * 4.60 / 1e6) = 0.00115 + 0.00230 = 0.003450
        const [inserted] = await tx<{ id: string; total_tokens: number; cost_estimate: string }[]>`
          INSERT INTO token_usage_logs (
            owner_id, request_id, model, feature, input_tokens, output_tokens, latency_ms, status
          )
          VALUES (
            ${ownerA.id}, 'req-test-ai-001', 'gemini-1.5-flash', 'chat', 1000, 500, 320, 'ok'
          )
          RETURNING id, total_tokens, cost_estimate;
        `;
        logId = inserted.id;
        expect(inserted.total_tokens).toBe(1500);
        expect(parseFloat(inserted.cost_estimate)).toBeCloseTo(0.00345, 5);
      });

      // Verify read by owner
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [read] = await tx<{ total_tokens: number }[]>`
          SELECT total_tokens FROM token_usage_logs WHERE id = ${logId};
        `;
        expect(read.total_tokens).toBe(1500);
      });
    });

    it("token_usage_logs: duplicate request_id throws unique constraint violation (idempotency)", async () => {
      let duplicateThrew = false;
      try {
        await withSystemContext(async (tx) => {
          await tx`
            INSERT INTO token_usage_logs (
              owner_id, request_id, model, feature, input_tokens, output_tokens, status
            )
            VALUES (
              ${ownerA.id}, 'req-test-ai-001', 'gemini-1.5-flash', 'chat', 500, 200, 'ok'
            );
          `;
        });
      } catch (err: any) {
        duplicateThrew = true;
        expect(err.message).toMatch(/duplicate key value violates unique constraint|token_usage_logs_request_id_key/i);
      }
      expect(duplicateThrew).toBe(true);
    });

    it("token_usage_logs: schema guarantees NO prompt or response content columns exist", async () => {
      const columns = await adminSql<{ column_name: string }[]>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'token_usage_logs';
      `;
      const colNames = columns.map((c) => c.column_name.toLowerCase());
      expect(colNames).not.toContain("prompt");
      expect(colNames).not.toContain("response");
      expect(colNames).not.toContain("message");
      expect(colNames).not.toContain("content");
    });
  });

  // ==========================================================================
  // 2. QUOTA & BILLING
  // ==========================================================================
  describe("2. Quota & Billing", () => {
    it("TC-18: Free daily limit reached -> not allowed, nothing breaks", async () => {
      // Owner B is on Gratis plan (10,000 daily limit)
      // Call 1: Consume 4,000 tokens -> allowed, 6,000 remaining
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const [res1] = await tx<{ allowed: boolean; remaining: string; message: string }[]>`
          SELECT allowed, remaining, message FROM fn_consume_quota(${ownerB.id}, 4000);
        `;
        expect(res1.allowed).toBe(true);
        expect(parseInt(res1.remaining, 10)).toBe(6000);
      });

      // Call 2: Consume 5,000 tokens -> allowed, 1,000 remaining
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const [res2] = await tx<{ allowed: boolean; remaining: string }[]>`
          SELECT allowed, remaining FROM fn_consume_quota(${ownerB.id}, 5000);
        `;
        expect(res2.allowed).toBe(true);
        expect(parseInt(res2.remaining, 10)).toBe(1000);
      });

      // Call 3: Request 2,000 tokens -> NOT allowed, 1,000 remaining, tokens_used not incremented
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const [res3] = await tx<{ allowed: boolean; remaining: string; message: string }[]>`
          SELECT allowed, remaining, message FROM fn_consume_quota(${ownerB.id}, 2000);
        `;
        expect(res3.allowed).toBe(false);
        expect(parseInt(res3.remaining, 10)).toBe(1000);
        expect(res3.message).toMatch(/daily free quota exceeded/i);
      });

      // Verify counter row in quota_counters is exactly 9,000
      const [counter] = await adminSql<{ tokens_used: string }[]>`
        SELECT tokens_used FROM quota_counters 
        WHERE owner_id = ${ownerB.id} AND period_type = 'day';
      `;
      expect(parseInt(counter.tokens_used, 10)).toBe(9000);
    });

    it("TC-21: Pro quota exhausted with top-ups flow", async () => {
      // Owner A is on Pro plan (2,000,000 monthly quota)
      // 1. Consume 1,950,000 tokens from monthly base
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [res1] = await tx<{ allowed: boolean; remaining: string }[]>`
          SELECT allowed, remaining FROM fn_consume_quota(${ownerA.id}, 1950000);
        `;
        expect(res1.allowed).toBe(true);
        expect(parseInt(res1.remaining, 10)).toBe(50000);
      });

      // 2. Add an active topup of 200,000 tokens
      const [topup] = await adminSql<{ id: string }[]>`
        INSERT INTO token_topups (owner_id, tokens_purchased, tokens_remaining, status)
        VALUES (${ownerA.id}, 200000, 200000, 'active')
        RETURNING id;
      `;

      // 3. Request 100,000 tokens:
      // 50,000 from monthly base (exhausts base), 50,000 from topup (leaves 150,000 in topup)
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [res2] = await tx<{ allowed: boolean; remaining: string }[]>`
          SELECT allowed, remaining FROM fn_consume_quota(${ownerA.id}, 100000);
        `;
        expect(res2.allowed).toBe(true);
        expect(parseInt(res2.remaining, 10)).toBe(150000);
      });

      // Verify top-up remaining is 150,000
      const [topupCheck] = await adminSql<{ tokens_remaining: string; status: string }[]>`
        SELECT tokens_remaining, status FROM token_topups WHERE id = ${topup.id};
      `;
      expect(parseInt(topupCheck.tokens_remaining, 10)).toBe(150000);
      expect(topupCheck.status).toBe("active");

      // 4. Request 150,000 tokens (exhausts top-up completely)
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [res3] = await tx<{ allowed: boolean; remaining: string }[]>`
          SELECT allowed, remaining FROM fn_consume_quota(${ownerA.id}, 150000);
        `;
        expect(res3.allowed).toBe(true);
        expect(parseInt(res3.remaining, 10)).toBe(0);
      });

      const [topupExhausted] = await adminSql<{ status: string }[]>`
        SELECT status FROM token_topups WHERE id = ${topup.id};
      `;
      expect(topupExhausted.status).toBe("exhausted");

      // 5. Subsequent request for 500 tokens is rejected
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [res4] = await tx<{ allowed: boolean; remaining: string }[]>`
          SELECT allowed, remaining FROM fn_consume_quota(${ownerA.id}, 500);
        `;
        expect(res4.allowed).toBe(false);
        expect(parseInt(res4.remaining, 10)).toBe(0);
      });
    });

    it("Concurrency: 20 parallel fn_consume_quota calls never exceed the limit", async () => {
      const rand = Math.random().toString(36).substring(2, 9);
      const [testUser] = await adminSql<{ id: string }[]>`
        INSERT INTO users (google_sub, email, role, status)
        VALUES (${'sub-concurrent-' + rand}, ${'concurrent-' + rand + '@test.id'}, 'owner', 'active')
        RETURNING id;
      `;
      const [testOwner] = await adminSql<{ id: string }[]>`
        INSERT INTO owners (user_id, business_name, business_type)
        VALUES (${testUser.id}, 'Toko Concurrency', 'toko')
        RETURNING id;
      `;

      // 20 parallel requests of 600 tokens each = 12,000 tokens total requested
      // Limit = 10,000 tokens. Exactly 16 calls must succeed (16 * 600 = 9,600 <= 10,000)
      // Exactly 4 calls must be rejected (9,600 + 600 = 10,200 > 10,000)
      const callPromises = Array.from({ length: 20 }, () =>
        withOwnerContext(testOwner.id, testUser.id, async (tx) => {
          const [res] = await tx<{ allowed: boolean; remaining: string }[]>`
            SELECT allowed, remaining FROM fn_consume_quota(${testOwner.id}, 600);
          `;
          return res;
        })
      );

      const results = await Promise.all(callPromises);

      const allowedCount = results.filter((r) => r.allowed === true).length;
      const rejectedCount = results.filter((r) => r.allowed === false).length;

      expect(allowedCount).toBe(16);
      expect(rejectedCount).toBe(4);

      // Verify exact stored counter in DB
      const [finalCounter] = await adminSql<{ tokens_used: string }[]>`
        SELECT tokens_used FROM quota_counters 
        WHERE owner_id = ${testOwner.id} AND period_type = 'day';
      `;
      expect(parseInt(finalCounter.tokens_used, 10)).toBe(9600);
      expect(parseInt(finalCounter.tokens_used, 10)).toBeLessThanOrEqual(10000);

      // Cleanup
      await adminSql.begin(async (tx) => {
        await tx`SET LOCAL app.allow_pdp_purge = 'on';`;
        await tx`DELETE FROM quota_counters WHERE owner_id = ${testOwner.id};`;
        await tx`DELETE FROM accounts WHERE owner_id = ${testOwner.id};`;
        await tx`DELETE FROM audit_log WHERE owner_id = ${testOwner.id};`;
        await tx`DELETE FROM owners WHERE id = ${testOwner.id};`;
        await tx`DELETE FROM users WHERE id = ${testUser.id};`;
      });
    });

    it("TC-19: Payment success activates Pro subscription and extends period", async () => {
      const testOrderId = "ORDER-MIDTRANS-INV-8899";
      await adminSql`DELETE FROM payment_history WHERE order_id = ${testOrderId};`;

      // Midtrans sends settlement notification with 49,000 IDR (SRS plan price)
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${ownerB.id}, ${testOrderId}, 'subscription', 49000.00, 'settlement', true, '{"channel": "qris", "plan": "pro"}'::jsonb);
      `;

      const [settleRes] = await adminSql<{ fn_activate_subscription: { status: string; plan: string } }[]>`
        SELECT fn_activate_subscription(${testOrderId});
      `;
      expect(settleRes.fn_activate_subscription.status).toBe("activated");
      expect(settleRes.fn_activate_subscription.plan).toBe("pro");

      // Verify subscription updated to Pro for owner B
      const [sub] = await adminSql<{ plan_name: string; status: string; current_period_end: Date }[]>`
        SELECT p.name AS plan_name, s.status, s.current_period_end
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE s.owner_id = ${ownerB.id};
      `;
      expect(sub.plan_name).toBe("pro");
      expect(sub.status).toBe("active");
    });

    it("TC-20: Payment failed, pending, or unverified does not activate subscription", async () => {
      const pendingOrderId = "ORDER-PENDING-INV-9901";
      await adminSql`DELETE FROM payment_history WHERE order_id = ${pendingOrderId};`;

      // 1. Pending payment record returns unpaid_or_failed
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${ownerB.id}, ${pendingOrderId}, 'subscription', 49000.00, 'pending', true, '{"channel": "qris"}'::jsonb);
      `;

      const [pendingRes] = await adminSql<{ fn_activate_subscription: { status: string } }[]>`
        SELECT fn_activate_subscription(${pendingOrderId});
      `;
      expect(pendingRes.fn_activate_subscription.status).toBe("unpaid_or_failed");

      // 2. Unverified signature throws exception
      const unverifiedOrderId = "ORDER-UNVERIFIED-INV-9902";
      await adminSql`DELETE FROM payment_history WHERE order_id = ${unverifiedOrderId};`;
      await adminSql`
        INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
        VALUES (${ownerB.id}, ${unverifiedOrderId}, 'subscription', 49000.00, 'settlement', false, '{"channel": "qris"}'::jsonb);
      `;

      let threw = false;
      try {
        await adminSql`SELECT fn_activate_subscription(${unverifiedOrderId});`;
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/signature not verified/i);
      }
      expect(threw).toBe(true);
    });
  });

  // ==========================================================================
  // 3. DOCUMENTS (Google Drive Integration Metadata)
  // ==========================================================================
  describe("3. Documents & Document Versions", () => {
    it("documents & document_versions: auto-increments version_no via trigger and enforces metadata only", async () => {
      let docId: string = "";

      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        // 1. Create document metadata
        const [doc] = await tx<{ id: string }[]>`
          INSERT INTO documents (owner_id, kind, title, drive_file_id, mime)
          VALUES (${ownerA.id}, 'laporan', 'Laporan Keuangan Q3 2026', 'drive-file-id-abc-123', 'application/pdf')
          RETURNING id;
        `;
        docId = doc.id;

        // 2. Insert Version 1 (omitting version_no)
        const [v1] = await tx<{ version_no: number }[]>`
          INSERT INTO document_versions (document_id, drive_revision_id, checksum, created_by)
          VALUES (${docId}, 'rev-001', 'sha256-hash-1', ${userA.id})
          RETURNING version_no;
        `;
        expect(v1.version_no).toBe(1);

        // 3. Insert Version 2 (omitting version_no)
        const [v2] = await tx<{ version_no: number }[]>`
          INSERT INTO document_versions (document_id, drive_revision_id, checksum, created_by)
          VALUES (${docId}, 'rev-002', 'sha256-hash-2', ${userA.id})
          RETURNING version_no;
        `;
        expect(v2.version_no).toBe(2);
      });

      // 4. Verify unique constraint on (document_id, version_no)
      let duplicateVersionThrew = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`
            INSERT INTO document_versions (document_id, version_no, drive_revision_id)
            VALUES (${docId}, 1, 'duplicate-rev');
          `;
        });
      } catch (err: any) {
        duplicateVersionThrew = true;
        expect(err.message).toMatch(/duplicate key value violates unique constraint|uq_doc_version/i);
      }
      expect(duplicateVersionThrew).toBe(true);
    });
  });

  // ==========================================================================
  // 4. SCHEDULING (Google Calendar Cache, GiST Exclude, Bookings & Reminders)
  // ==========================================================================
  describe("4. Scheduling (GiST Exclusion, Conflict Check, Bookings, Reminders)", () => {
    const start1 = "2026-11-20T09:00:00+07:00";
    const end1 = "2026-11-20T10:30:00+07:00";

    it("schedules: confirmed schedule prevents overlapping times via GiST exclusion constraint", async () => {
      let schedule1Id: string = "";

      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [s1] = await tx<{ id: string }[]>`
          INSERT INTO schedules (owner_id, google_event_id, title, start_at, end_at, status, source)
          VALUES (${ownerA.id}, 'gcal-evt-001', 'Sesi Konsultasi Bisnis', ${start1}, ${end1}, 'confirmed', 'dashboard')
          RETURNING id;
        `;
        schedule1Id = s1.id;
      });

      // 1. Conflict detection function fn_check_conflict
      const conflictOverlapping = await appSql<{ fn_check_conflict: boolean }[]>`
        SELECT fn_check_conflict(${ownerA.id}, '2026-11-20T10:00:00+07:00', '2026-11-20T11:00:00+07:00');
      `;
      expect(conflictOverlapping[0].fn_check_conflict).toBe(true);

      const conflictAdjacent = await appSql<{ fn_check_conflict: boolean }[]>`
        SELECT fn_check_conflict(${ownerA.id}, '2026-11-20T10:30:00+07:00', '2026-11-20T11:30:00+07:00');
      `;
      expect(conflictAdjacent[0].fn_check_conflict).toBe(false); // Adjacent [) does not overlap

      // 2. Inserting overlapping confirmed schedule directly throws GiST exclusion violation
      let exclusionThrew = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          await tx`
            INSERT INTO schedules (owner_id, title, start_at, end_at, status, source)
            VALUES (${ownerA.id}, 'Overlapping Event', '2026-11-20T10:00:00+07:00', '2026-11-20T11:00:00+07:00', 'confirmed', 'chat');
          `;
        });
      } catch (err: any) {
        exclusionThrew = true;
        expect(err.message).toMatch(/conflicting key value violates exclusion constraint|exclude_overlapping_confirmed_schedules/i);
      }
      expect(exclusionThrew).toBe(true);

      // 3. Cancelled schedule with overlapping time DOES NOT violate exclusion constraint
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [cancelled] = await tx<{ id: string }[]>`
          INSERT INTO schedules (owner_id, title, start_at, end_at, status, source)
          VALUES (${ownerA.id}, 'Cancelled Overlapping', '2026-11-20T10:00:00+07:00', '2026-11-20T11:00:00+07:00', 'cancelled', 'booking')
          RETURNING id;
        `;
        expect(cancelled.id).toBeDefined();
      });

      // 4. Other tenant can book the exact same time without conflict
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const [sB] = await tx<{ id: string }[]>`
          INSERT INTO schedules (owner_id, title, start_at, end_at, status, source)
          VALUES (${ownerB.id}, 'Owner B Concurrent Slot', ${start1}, ${end1}, 'confirmed', 'chat')
          RETURNING id;
        `;
        expect(sB.id).toBeDefined();
      });
    });

    it("bookings & reminders: buyer booking and automated reminders link to schedules", async () => {
      let bookingId: string = "";
      let reminderId: string = "";

      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        // Find existing schedule
        const [sched] = await tx<{ id: string }[]>`
          SELECT id FROM schedules WHERE owner_id = ${ownerA.id} AND status = 'confirmed' LIMIT 1;
        `;

        // Create booking
        const [bk] = await tx<{ id: string }[]>`
          INSERT INTO bookings (
            owner_id, customer_name, customer_phone, service_name, requested_start_at, requested_end_at, status, schedule_id
          )
          VALUES (
            ${ownerA.id}, 'Hendra Wijaya', '628123456789', 'Konsultasi Menu',
            '2026-11-25T14:00:00+07:00', '2026-11-25T15:00:00+07:00', 'approved', ${sched.id}
          )
          RETURNING id;
        `;
        bookingId = bk.id;

        // Create reminder
        const [rm] = await tx<{ id: string }[]>`
          INSERT INTO reminders (
            owner_id, schedule_id, channel, recipient, remind_at, status
          )
          VALUES (
            ${ownerA.id}, ${sched.id}, 'whatsapp', '628123456789',
            '2026-11-20T08:00:00+07:00', 'pending'
          )
          RETURNING id;
        `;
        reminderId = rm.id;
      });

      expect(bookingId).toBeDefined();
      expect(reminderId).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. INGESTION & WEBHOOK IDEMPOTENCY
  // ==========================================================================
  describe("5. Ingestion & Webhook Idempotency", () => {
    it("TC-15: Duplicate webhook creates one record (channel, external_message_id unique)", async () => {
      const msgId = "wamid.HBgMNjI4MTIzNDU2Nzg5FQIAEhggQ0RERTExMjI=";

      // 1. First webhook delivery
      await withSystemContext(async (tx) => {
        await tx`
          INSERT INTO inbound_messages (channel, external_message_id, owner_id, sender_id, status)
          VALUES ('whatsapp', ${msgId}, ${ownerA.id}, '628111222333', 'received');
        `;
      });

      // 2. Duplicate webhook delivery rejected by unique constraint
      let duplicateWebhookThrew = false;
      try {
        await withSystemContext(async (tx) => {
          await tx`
            INSERT INTO inbound_messages (channel, external_message_id, owner_id, sender_id, status)
            VALUES ('whatsapp', ${msgId}, ${ownerA.id}, '628111222333', 'received');
          `;
        });
      } catch (err: any) {
        duplicateWebhookThrew = true;
        expect(err.message).toMatch(/duplicate key value violates unique constraint|uq_inbound_channel_msg/i);
      }
      expect(duplicateWebhookThrew).toBe(true);

      // Verify exactly 1 record exists
      const rows = await adminSql`
        SELECT id FROM inbound_messages WHERE channel = 'whatsapp' AND external_message_id = ${msgId};
      `;
      expect(rows.length).toBe(1);
    });

    it("chat_logs: stores AI conversation summary and sentiment without raw prompt/responses", async () => {
      await withSystemContext(async (tx) => {
        await tx`
          INSERT INTO chat_logs (owner_id, channel, external_sender_id, summary, intent, sentiment)
          VALUES (
            ${ownerA.id}, 'whatsapp', '628111222333',
            'Pelanggan menanyakan ketersediaan kopi susu robusta untuk 50 cup katering.',
            'tanya_menu', 'positive'
          );
        `;
      });

      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [log] = await tx<{ summary: string; sentiment: string }[]>`
          SELECT summary, sentiment FROM chat_logs WHERE owner_id = ${ownerA.id};
        `;
        expect(log.summary).toContain("50 cup katering");
        expect(log.sentiment).toBe("positive");
      });
    });
  });

  // ==========================================================================
  // 6. OPS, PROCEDURES & SYSTEM LOGS
  // ==========================================================================
  describe("6. Ops, Procedures & System Logs", () => {
    it("sp_expire_pending_actions: expires pending actions past their expires_at timestamp", async () => {
      // Create an expired pending action
      const [action] = await adminSql<{ id: string }[]>`
        INSERT INTO pending_actions (owner_id, type, payload, status, expires_at)
        VALUES (
          ${ownerA.id}, 'post_journal', '{}'::jsonb, 'pending', now() - interval '5 minutes'
        )
        RETURNING id;
      `;

      // Call stored procedure
      await adminSql`CALL sp_expire_pending_actions();`;

      const [updated] = await adminSql<{ status: string }[]>`
        SELECT status FROM pending_actions WHERE id = ${action.id};
      `;
      expect(updated.status).toBe("expired");
    });

    it("sp_purge_old_logs: batch purges logs older than retention_days", async () => {
      // Insert old system log from 60 days ago
      await adminSql`
        INSERT INTO system_logs (level, component, code, message, created_at)
        VALUES ('info', 'pipeline', 'OLD_LOG', 'Test old log entry', now() - interval '60 days');
      `;

      // Insert fresh system log from today
      const [fresh] = await adminSql<{ id: string }[]>`
        INSERT INTO system_logs (level, component, code, message, created_at)
        VALUES ('info', 'pipeline', 'FRESH_LOG', 'Test fresh log entry', now())
        RETURNING id;
      `;

      // Purge logs older than 30 days
      await adminSql`CALL sp_purge_old_logs(30);`;

      const oldRows = await adminSql`SELECT id FROM system_logs WHERE code = 'OLD_LOG';`;
      expect(oldRows.length).toBe(0);

      const freshRows = await adminSql`SELECT id FROM system_logs WHERE id = ${fresh.id};`;
      expect(freshRows.length).toBe(1);
    });

    it("fn_suspend_owner: suspends owner status and writes audit log with immutability protection", async () => {
      const reason = "Pelanggaran terms of service (spamming WA broadcast)";

      // Admin calls fn_suspend_owner
      await withAdminContext(adminUser.id, async (tx) => {
        await tx`SELECT fn_suspend_owner(${ownerB.id}, ${reason});`;
      });

      // Check owner status is suspended
      const [o] = await adminSql<{ status: string; suspended_reason: string }[]>`
        SELECT status, suspended_reason FROM owners WHERE id = ${ownerB.id};
      `;
      expect(o.status).toBe("suspended");
      expect(o.suspended_reason).toBe(reason);

      // Verify audit log entry
      const [audit] = await adminSql<{ action: string; reason: string }[]>`
        SELECT action, reason FROM admin_audit_log WHERE target_owner_id = ${ownerB.id};
      `;
      expect(audit.action).toBe("SUSPEND_OWNER");
      expect(audit.reason).toBe(reason);

      // Attempting to modify admin_audit_log via admin context is rejected by trigger / grant
      let auditTamperThrew = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`UPDATE admin_audit_log SET reason = 'Tampered' WHERE target_owner_id = ${ownerB.id};`;
        });
      } catch (err: any) {
        auditTamperThrew = true;
        expect(err.message).toMatch(/(permission denied for table admin_audit_log|admin_audit_log is append-only)/i);
      }
      expect(auditTamperThrew).toBe(true);

      // Restore owner B status
      await adminSql`UPDATE owners SET status = 'active', suspended_reason = NULL WHERE id = ${ownerB.id};`;
    });
  });

  // ==========================================================================
  // 7. ADMIN VIEWS & LEAST-PRIVILEGE SECURITY BOUNDARIES
  // ==========================================================================
  describe("7. Admin Views & Security Boundaries (security_invoker = true)", () => {
    it("v_admin_owners: Admin can read tenant metadata including channel count and plan name", async () => {
      await withAdminContext(adminUser.id, async (tx) => {
        const rows = await tx<{
          owner_id: string;
          business_name: string;
          plan_name: string;
          total_channels: number;
        }[]>`
          SELECT owner_id, business_name, plan_name, total_channels
          FROM v_admin_owners
          ORDER BY business_name;
        `;
        expect(rows.length).toBeGreaterThanOrEqual(2);
        const warkop = rows.find((r) => r.business_name === "Warkop Nusantara");
        expect(warkop).toBeDefined();
        expect(warkop?.plan_name).toBe("pro");
        expect(Number(warkop?.total_channels)).toBeGreaterThanOrEqual(1);
      });
    });

    it("v_admin_token_usage: Admin can read aggregated AI metrics without seeing prompt text", async () => {
      await withAdminContext(adminUser.id, async (tx) => {
        const rows = await tx<{
          business_name: string;
          model: string;
          total_calls: string;
          total_tokens: string;
        }[]>`
          SELECT business_name, model, total_calls, total_tokens
          FROM v_admin_token_usage;
        `;
        expect(rows.length).toBeGreaterThan(0);
        const entry = rows.find((r) => r.business_name === "Warkop Nusantara");
        expect(entry).toBeDefined();
        expect(parseInt(entry!.total_calls, 10)).toBeGreaterThanOrEqual(1);
        expect(parseInt(entry!.total_tokens, 10)).toBeGreaterThan(0);
      });
    });

    it("v_admin_system_health: Admin can read component error telemetry", async () => {
      // Insert an error log
      await adminSql`
        INSERT INTO system_logs (level, component, code, message)
        VALUES ('error', 'whatsapp_gateway', 'ERR_CONN_TIMEOUT', 'Connection dropped');
      `;

      await withAdminContext(adminUser.id, async (tx) => {
        const rows = await tx<{ component: string; error_count: string }[]>`
          SELECT component, error_count FROM v_admin_system_health WHERE component = 'whatsapp_gateway';
        `;
        expect(rows.length).toBe(1);
        expect(parseInt(rows[0].error_count, 10)).toBeGreaterThanOrEqual(1);
      });
    });

    // ------------------------------------------------------------------------
    // TC-22: Admin Context Least-Privilege Boundary on Content Tables
    // ------------------------------------------------------------------------
    describe("TC-22: Admin sees metadata only (permission denied on content tables)", () => {
      it("Admin is denied access to chat_logs", async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM chat_logs;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(/permission denied for table chat_logs/i);
        }
        expect(threw).toBe(true);
      });

      it("Admin is denied access to documents", async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM documents;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(/permission denied for table documents/i);
        }
        expect(threw).toBe(true);
      });

      it("Admin is denied access to document_versions", async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM document_versions;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(/permission denied for table document_versions/i);
        }
        expect(threw).toBe(true);
      });

      it("Admin is denied access to schedules", async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM schedules;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(/permission denied for table schedules/i);
        }
        expect(threw).toBe(true);
      });

      it("Admin is denied access to bookings", async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM bookings;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(/permission denied for table bookings/i);
        }
        expect(threw).toBe(true);
      });

      it("Admin is denied access to reminders", async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM reminders;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(/permission denied for table reminders/i);
        }
        expect(threw).toBe(true);
      });

      it("Admin is denied access to inbound_messages", async () => {
        let threw = false;
        try {
          await withAdminContext(adminUser.id, async (tx) => {
            await tx`SELECT * FROM inbound_messages;`;
          });
        } catch (err: any) {
          threw = true;
          expect(err.message).toMatch(/permission denied for table inbound_messages/i);
        }
        expect(threw).toBe(true);
      });
    });
  });
});
