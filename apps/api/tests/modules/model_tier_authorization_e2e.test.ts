import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../src/index";
import { adminSql } from "../../src/db/client";
import { signSession } from "../../src/lib/session";
import { chatService } from "../../src/modules/chat/chat.service";

describe("E2E Test Suite: Complete Model Tier Authorization & Graceful Fallback", () => {
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

    // Pastikan owner aktif di gratis
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

  afterAll(async () => {
    // Reset owner ke gratis dan model ke nemotron
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

  it("E2E 1: Siklus Lengkap Akun Gratis (Katalog -> Pilih Free -> Tolak Pro -> Runtime Chat)", async () => {
    // 1. Ambil katalog model
    const catRes = await app.handle(
      new Request("http://localhost/api/owner/personalisasi/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
    );
    expect(catRes.status).toBe(200);
    const catJson = (await catRes.json()) as any;
    expect(catJson.subscription.is_pro).toBe(false);

    // 2. Coba pilih model Pro -> Ditolak 403 Forbidden
    const rejectRes = await app.handle(
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
    expect(rejectRes.status).toBe(403);
    const rejectJson = (await rejectRes.json()) as any;
    expect(rejectJson.error).toBe("TIER_INSUFFICIENT");

    // 3. Pilih model Free -> Diterima 200 OK
    const acceptRes = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          selected_model_id: "nvidia/nemotron-3.5-lightning-free",
        }),
      })
    );
    expect(acceptRes.status).toBe(200);
    const acceptJson = (await acceptRes.json()) as any;
    expect(acceptJson.config.selected_model_id).toBe("nvidia/nemotron-3.5-lightning-free");

    // 4. Runtime Chat resolving model yang sah
    const resolvedModel = await chatService.resolveEffectiveModel(ownerId);
    expect(resolvedModel).toBe("nvidia/nemotron-3.5-lightning-free");
  });

  it("E2E 2: Siklus Lengkap Akun Pro (Upgrade -> Pilih Pro -> Runtime Pro -> Downgrade Fallback)", async () => {
    // 1. Simulasikan Upgrade ke Pro
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${proPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    // 2. Sekarang pilih model Pro via API -> Sukses 200 OK
    const updateProRes = await app.handle(
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
    expect(updateProRes.status).toBe(200);
    const updateProJson = (await updateProRes.json()) as any;
    expect(updateProJson.config.selected_model_id).toBe("google/gemini-2.5-flash");

    // 3. Runtime Chat saat Pro aktif menggunakan model Pro
    const resolvedPro = await chatService.resolveEffectiveModel(ownerId);
    expect(resolvedPro).toBe("google/gemini-2.5-flash");

    // 4. Simulasikan Masa Berlangganan Pro Berakhir (Expired)
    await adminSql`
      UPDATE subscriptions
      SET current_period_end = now() - interval '1 day'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    // 5. Runtime Chat otomatis graceful fallback ke default free tanpa error
    const fallbackModel = await chatService.resolveEffectiveModel(ownerId);
    expect(fallbackModel).toBe("nvidia/nemotron-3.5-lightning-free");

    // 6. Upaya update bot personalisasi setelah expired kembali ditolak 403
    const expiredUpdateRes = await app.handle(
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
    expect(expiredUpdateRes.status).toBe(403);

    // Reset kembali ke gratis dan nemotron untuk tes berikutnya
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

  it("E2E 3: Verifikasi Konsistensi Database & Data Bot Tenant", async () => {
    // Verifikasi semua bot_configs tenant riil memiliki model valid
    const configs = await adminSql<{ selected_model_id: string }[]>`
      SELECT selected_model_id FROM bot_configs;
    `;

    for (const c of configs) {
      expect(c.selected_model_id).not.toBe("gemini-1.5-flash");
      expect(c.selected_model_id).toBe("nvidia/nemotron-3.5-lightning-free");
    }

    // Verifikasi jumlah akun tetap konsisten minimal akun riil
    const users = await adminSql`SELECT email FROM users;`;
    expect(users.length).toBeGreaterThanOrEqual(3);
  });
});
