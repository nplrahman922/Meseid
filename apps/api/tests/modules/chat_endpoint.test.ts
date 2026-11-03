import { describe, expect, it, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { apiRoutes } from "../../src/routes";
import { env } from "../../src/config/env";
import { withSystemContext, withOwnerContext, adminSql } from "../../src/db/client";
import { SEED_IDS } from "../../src/db/seed";

describe("Chat Inbound API Integration Suite", () => {
  const app = new Elysia().use(apiRoutes);

  const testBotId = "test_bot_tele_12345";
  const testOwnerSenderId = env.DEV_OWNER_TELEGRAM_ID || "123456789";

  beforeAll(async () => {
    // Pastikan koneksi bot terikat ke Owner A secara bersih
    await adminSql`
      DELETE FROM channel_connections WHERE external_account_id = ${testBotId};
    `;
    await adminSql`
      INSERT INTO channel_connections (owner_id, channel, external_account_id, status)
      VALUES (${SEED_IDS.OWNER_A_ID}, 'telegram', ${testBotId}, 'connected');
    `;
    // Daftarkan testOwnerSenderId ke whitelist allowed_contacts Owner A
    await adminSql`
      UPDATE bot_configs
      SET allowed_contacts = jsonb_build_array(${testOwnerSenderId}::text)
      WHERE owner_id = ${SEED_IDS.OWNER_A_ID};
    `;
  });

  it("menolak request tanpa header x-internal-secret (HTTP 401)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/chat/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "telegram",
          bot_id: testBotId,
          external_message_id: "msg_unauthorized_001",
          sender_id: "999999",
          sender_name: "Hacker",
          chat_id: "999999",
          chat_type: "private",
          message_type: "text",
          text: "Beli bensin 25rb",
          timestamp: Date.now(),
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.error).toContain("Unauthorized");
  });

  it("berhasil memproses pesan transaksi dari Owner dan mencatat ke jurnal umum", async () => {
    await new Promise((r) => setTimeout(r, 12500));
    const externalMsgId = `test_owner_tx_${Date.now()}`;

    const res = await app.handle(
      new Request("http://localhost/api/chat/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({
          channel: "telegram",
          bot_id: testBotId,
          external_message_id: externalMsgId,
          sender_id: testOwnerSenderId,
          sender_name: "Budi Owner",
          chat_id: testOwnerSenderId,
          chat_type: "private",
          message_type: "text",
          text: "Beli bensin 25rb buat motor operasional",
          timestamp: Date.now(),
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
    expect(typeof body.reply_text).toBe("string");
    expect(body.reply_text.length).toBeGreaterThan(5);

    // Verifikasi di database: inbound_messages status = 'done'
    const inboundRecord = await withSystemContext(async (tx) => {
      const rows = await tx<{ status: string; owner_id: string }[]>`
        SELECT status, owner_id FROM inbound_messages
        WHERE channel = 'telegram' AND external_message_id = ${externalMsgId};
      `;
      return rows[0];
    });

    expect(inboundRecord).toBeDefined();
    expect(inboundRecord.status).toBe("done");
    expect(inboundRecord.owner_id).toBe(SEED_IDS.OWNER_A_ID);

    // Verifikasi di database: jurnal_umum & jurnal_baris tersimpan dengan debit == credit
    const journalRecord = await withOwnerContext(
      SEED_IDS.OWNER_A_ID,
      SEED_IDS.OWNER_A_USER,
      async (tx) => {
        const rows = await tx<{ id: string; description: string; source_ref: string }[]>`
          SELECT id, description, source_ref FROM jurnal_umum
          WHERE source_ref = ${externalMsgId};
        `;
        return rows[0];
      }
    );

    expect(journalRecord).toBeDefined();
    expect(journalRecord.source_ref).toBe(externalMsgId);
  }, 65000);

  it("mengabaikan pesan duplikat (idempotency check)", async () => {
    await new Promise((r) => setTimeout(r, 12500));
    const externalMsgId = `test_dup_${Date.now()}`;

    // Kirim pertama
    const res1 = await app.handle(
      new Request("http://localhost/api/chat/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({
          channel: "telegram",
          bot_id: testBotId,
          external_message_id: externalMsgId,
          sender_id: testOwnerSenderId,
          sender_name: "Budi Owner",
          chat_id: testOwnerSenderId,
          chat_type: "private",
          message_type: "text",
          text: "Halo asisten",
          timestamp: Date.now(),
        }),
      })
    );
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.status).toBe("success");

    // Kirim kedua dengan ID yang sama
    const res2 = await app.handle(
      new Request("http://localhost/api/chat/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({
          channel: "telegram",
          bot_id: testBotId,
          external_message_id: externalMsgId,
          sender_id: testOwnerSenderId,
          sender_name: "Budi Owner",
          chat_id: testOwnerSenderId,
          chat_type: "private",
          message_type: "text",
          text: "Halo asisten",
          timestamp: Date.now(),
        }),
      })
    );
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.status).toBe("ignored");
  }, 65000);

  it("pada persona pembeli, transaksi tidak dicatat ke jurnal pembukuan", async () => {
    await new Promise((r) => setTimeout(r, 14000));
    const externalMsgId = `test_buyer_tx_${Date.now()}`;
    const buyerSenderId = "987654321"; // Bukan owner

    const res = await app.handle(
      new Request("http://localhost/api/chat/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({
          channel: "telegram",
          bot_id: testBotId,
          external_message_id: externalMsgId,
          sender_id: buyerSenderId,
          sender_name: "Pelanggan Anto",
          chat_id: buyerSenderId,
          chat_type: "private",
          message_type: "text",
          text: "Saya beli kopi susu 15rb ya kak",
          timestamp: Date.now(),
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");

    // Verifikasi: tidak ada jurnal yang dicatat dengan source_ref ini
    const journalRows = await withOwnerContext(
      SEED_IDS.OWNER_A_ID,
      SEED_IDS.OWNER_A_USER,
      async (tx) => {
        return tx`
          SELECT id FROM jurnal_umum WHERE source_ref = ${externalMsgId};
        `;
      }
    );
    expect(journalRows.length).toBe(0);

    // Tapi chat_logs tetap tercatat
    const chatLogRows = await withOwnerContext(
      SEED_IDS.OWNER_A_ID,
      SEED_IDS.OWNER_A_USER,
      async (tx) => {
        return tx`
          SELECT id, summary FROM chat_logs
          WHERE channel = 'telegram' AND external_sender_id = ${buyerSenderId}
          ORDER BY created_at DESC LIMIT 1;
        `;
      }
    );
    expect(chatLogRows.length).toBe(1);
  }, 65000);
});
