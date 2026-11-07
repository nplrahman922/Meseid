import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { signSession } from "../../src/lib/session";

describe("Kanal Status & Bot Disconnect Endpoints", () => {
  let ownerToken: string;
  let ownerId: string;

  beforeAll(async () => {
    await runSeed();

    const [ownerRow] = await adminSql`
      SELECT o.id as owner_id, o.user_id, u.email
      FROM owners o
      JOIN users u ON u.id = o.user_id
      WHERE u.email = 'budi@warkopnusantara.id';
    `;

    expect(ownerRow).toBeDefined();
    ownerId = ownerRow.owner_id;

    ownerToken = signSession({
      userId: ownerRow.user_id,
      email: ownerRow.email,
      role: "owner",
    });

    // Ensure a known connection exists for testing disconnect
    await adminSql`
      INSERT INTO channel_connections (owner_id, channel, external_account_id, status, session_ref)
      VALUES 
        (${ownerId}::uuid, 'whatsapp', '62811111111', 'connected', ${`owner_${ownerId.replace(/-/g, "_")}`}),
        (${ownerId}::uuid, 'telegram', '123456:TEST_TOKEN', 'connected', 'session_tg_123456')
      ON CONFLICT (channel, external_account_id)
      DO UPDATE SET status = 'connected', updated_at = now();
    `;
  });

  it("GET /api/owner/kanal/status returns consolidated status with WhatsApp and Telegram data", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/owner/kanal/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          Accept: "application/json",
        },
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.data).toBeDefined();
    expect(json.data.businessName).toBeDefined();
    expect(json.data.whatsapp).toBeDefined();
    expect(["connected", "disconnected", "connecting", "qr_ready", "conflict"]).toContain(json.data.whatsapp.status);
    expect(json.data.telegram).toBeDefined();
    expect(["connected", "disconnected"]).toContain(json.data.telegram.status);
    expect(json.data.ownerPhoneVerified).toBeDefined();
  });

  it("POST /api/bot/whatsapp/disconnect marks whatsapp status as disconnected in database", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/whatsapp/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.data.success).toBe(true);

    // Verify in DB
    const [row] = await adminSql`
      SELECT status FROM channel_connections
      WHERE owner_id = ${ownerId}::uuid AND channel = 'whatsapp';
    `;
    expect(row).toBeDefined();
    expect(row.status).toBe("disconnected");
  });

  it("POST /api/bot/telegram/disconnect marks telegram status as disconnected in database", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/telegram/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.data.success).toBe(true);

    // Verify in DB
    const [row] = await adminSql`
      SELECT status FROM channel_connections
      WHERE owner_id = ${ownerId}::uuid AND channel = 'telegram';
    `;
    expect(row).toBeDefined();
    expect(row.status).toBe("disconnected");
  });

  it("POST /api/bot/telegram/test fails gracefully with invalid/disconnected token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/telegram/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.status).toBe("error");
    expect(json.error).toBe("TELEGRAM_UNHEALTHY");
  });
});
