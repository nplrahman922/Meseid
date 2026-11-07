import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { env } from "../../src/config/env";
import { handleWhatsAppLoggedOutAction } from "../../src/modules/bot";

describe("WhatsApp Logged-Out Realtime Sync & Self-Healing", () => {
  let testOwnerId: string;
  let testSessionId: string;

  beforeAll(async () => {
    await runSeed();

    const [owner] = await adminSql<{ id: string }[]>`
      SELECT id FROM owners LIMIT 1;
    `;
    expect(owner).toBeDefined();
    testOwnerId = owner.id;
    testSessionId = `owner_${testOwnerId.replace(/-/g, "_")}`;

    // Pastikan koneksi whatsapp terpasang dengan status 'connected'
    await adminSql`
      INSERT INTO channel_connections (owner_id, channel, external_account_id, status, session_ref)
      VALUES (${testOwnerId}::uuid, 'whatsapp', '62899999999', 'connected', ${testSessionId})
      ON CONFLICT (channel, external_account_id)
      DO UPDATE SET status = 'connected', session_ref = ${testSessionId}, updated_at = now();
    `;
  });

  it("handleWhatsAppLoggedOutAction updates DB status to 'disconnected'", async () => {
    const result = await adminSql.begin(async (tx) => {
      return await handleWhatsAppLoggedOutAction(tx, testSessionId, testOwnerId);
    });

    expect(result.success).toBe(true);
    expect(result.affectedRows).toBeGreaterThanOrEqual(1);

    const [row] = await adminSql<{ status: string }[]>`
      SELECT status FROM channel_connections
      WHERE owner_id = ${testOwnerId}::uuid AND channel = 'whatsapp';
    `;
    expect(row.status).toBe("disconnected");
  });

  it("POST /api/internal/whatsapp/on-logged-out rejects requests without valid secret", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/internal/whatsapp/on-logged-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": "wrong-secret",
        },
        body: JSON.stringify({ session_id: testSessionId }),
      })
    );

    expect(res.status).toBe(401);
  });

  it("POST /api/internal/whatsapp/on-logged-out marks DB row as disconnected via HTTP", async () => {
    // Setel ulang status menjadi 'connected'
    await adminSql`
      UPDATE channel_connections
      SET status = 'connected'
      WHERE owner_id = ${testOwnerId}::uuid AND channel = 'whatsapp';
    `;

    const res = await app.handle(
      new Request("http://localhost/api/internal/whatsapp/on-logged-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({
          session_id: testSessionId,
          owner_id: testOwnerId,
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.data.success).toBe(true);

    const [row] = await adminSql<{ status: string }[]>`
      SELECT status FROM channel_connections
      WHERE owner_id = ${testOwnerId}::uuid AND channel = 'whatsapp';
    `;
    expect(row.status).toBe("disconnected");
  });
});
