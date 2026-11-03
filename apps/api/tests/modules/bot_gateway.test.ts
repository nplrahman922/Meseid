import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { signSession } from "../../src/lib/session";

describe("Bot Gateway Client & Status Proxy Routes", () => {
  let ownerToken: string;

  beforeAll(async () => {
    await runSeed();

    const [ownerRow] = await adminSql`
      SELECT o.id as owner_id, o.user_id, u.email
      FROM owners o
      JOIN users u ON u.id = o.user_id
      WHERE u.email = 'budi@warkopnusantara.id';
    `;

    expect(ownerRow).toBeDefined();

    ownerToken = signSession({
      userId: ownerRow.user_id,
      email: ownerRow.email,
      role: "owner",
    });
  });

  it("GET /api/bot/whatsapp/status returns connection state from bot gateway", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/whatsapp/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.whatsapp).toBeDefined();
    expect(json.whatsapp.sessionId).toBe("default");
    expect(["open", "connecting", "qr_ready", "close", "logged_out"]).toContain(json.whatsapp.status);
  });

  it("POST /api/bot/telegram/verify validates token structure and rejects invalid tokens cleanly", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/telegram/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          token: "dummy_invalid_token_12345",
        }),
      })
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.status).toBe("error");
    expect(json.error).toBe("INVALID_TELEGRAM_TOKEN");
  });

  it("POST /api/bot/telegram/verify rejects empty token with 400", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/telegram/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          token: "",
        }),
      })
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error).toBe("VALIDATION_ERROR");
  });
});
