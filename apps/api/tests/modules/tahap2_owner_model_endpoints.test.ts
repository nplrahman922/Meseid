import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../src/index";
import { adminSql } from "../../src/db/client";
import { signSession } from "../../src/lib/session";

describe("Tahap 2 Test Suite: Owner AI Model Endpoints & Tier Authorization", () => {
  let ownerToken: string;
  let ownerId: string;
  let gratisPlanId: string;
  let proPlanId: string;

  beforeAll(async () => {
    const [user] = await adminSql`SELECT id, email, role FROM users WHERE email = 'nplrahman992@gmail.com';`;
    const [owner] = await adminSql`SELECT id FROM owners WHERE user_id = ${user.id};`;
    ownerId = owner.id;

    ownerToken = signSession({
      userId: user.id,
      ownerId: owner.id,
      role: "owner",
      email: user.email,
    });

    const plans = await adminSql<{ id: string; name: string }[]>`
      SELECT id, name FROM plans WHERE name IN ('gratis', 'pro');
    `;
    gratisPlanId = plans.find((p) => p.name === "gratis")!.id;
    proPlanId = plans.find((p) => p.name === "pro")!.id;

    // Pastikan owner berlangganan paket gratis aktif
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${gratisPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;
  });

  afterAll(async () => {
    // Pastikan database kembali ke paket gratis aktif
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${gratisPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;
  });

  it("TEST 2.1: GET /api/owner/personalisasi/models memerlukan autentikasi (401)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi/models", {
        method: "GET",
      })
    );
    expect(res.status).toBe(401);
  });

  it("TEST 2.2: GET /api/owner/personalisasi/models mengembalikan katalog model dengan flag aksesibilitas presisi", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;

    expect(json.status).toBe("ok");
    expect(json.models).toBeDefined();
    expect(Array.isArray(json.models)).toBe(true);
    expect(json.models.length).toBeGreaterThan(0);
    expect(json.subscription.plan_name).toBe("gratis");
    expect(json.subscription.is_pro).toBe(false);

    // Cari model free dan pro
    const freeModel = json.models.find(
      (m: any) => m.model_id === "nvidia/nemotron-3.5-lightning-free"
    );
    expect(freeModel).toBeDefined();
    expect(freeModel.is_accessible).toBe(true);

    const proModel = json.models.find(
      (m: any) => m.model_id === "google/gemini-2.5-flash"
    );
    expect(proModel).toBeDefined();
    expect(proModel.is_accessible).toBe(false);
  });

  it("TEST 2.3: PUT /api/owner/personalisasi sukses memilih model gratis (200 OK)", async () => {
    const targetModel = "nvidia/nemotron-3.5-lightning-free";

    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          selected_model_id: targetModel,
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.config.selected_model_id).toBe(targetModel);

    // Verifikasi di database
    const [dbRow] = await adminSql`
      SELECT selected_model_id FROM bot_configs WHERE owner_id = ${ownerId}::uuid;
    `;
    expect(dbRow.selected_model_id).toBe(targetModel);
  });

  it("TEST 2.4: PUT /api/owner/personalisasi DITOLAK (403 Forbidden) saat akun gratis mencoba memilih model Pro", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          selected_model_id: "google/gemini-2.5-flash",
        }),
      })
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error).toBe("TIER_INSUFFICIENT");
    expect(json.message).toContain("hanya tersedia untuk pengguna Paket Pro");

    // Verifikasi database tidak berubah
    const [dbRow] = await adminSql`
      SELECT selected_model_id FROM bot_configs WHERE owner_id = ${ownerId}::uuid;
    `;
    expect(dbRow.selected_model_id).toBe("nvidia/nemotron-3.5-lightning-free");
  });

  it("TEST 2.5: PUT /api/owner/personalisasi DITOLAK (400 Bad Request) jika model tidak ada di katalog", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          selected_model_id: "fake-provider/model-yang-tidak-eksis",
        }),
      })
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error).toBe("MODEL_NOT_FOUND");
  });

  it("TEST 2.6: PUT /api/owner/personalisasi sukses memilih model Pro setelah upgrade ke paket Pro", async () => {
    // 1. Upgrade owner ke Pro
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${proPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    // 2. Sekarang pilih model Pro
    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          selected_model_id: "google/gemini-2.5-flash",
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.config.selected_model_id).toBe("google/gemini-2.5-flash");

    // 3. Kembalikan langganan ke gratis dan reset model ke nemotron
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${gratisPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'nvidia/nemotron-3.5-lightning-free'
      WHERE owner_id = ${ownerId}::uuid;
    `;
  });
});
