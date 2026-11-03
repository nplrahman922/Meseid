import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { chatService } from "../../src/modules/chat/chat.service";
import { adminSql } from "../../src/db/client";

describe("Tahap 3 Test Suite: Chat Runtime Model Resolution & Graceful Fallback", () => {
  let ownerId: string;
  let gratisPlanId: string;
  let proPlanId: string;

  beforeAll(async () => {
    const [owner] = await adminSql`SELECT id FROM owners LIMIT 1;`;
    ownerId = owner.id;

    const plans = await adminSql<{ id: string; name: string }[]>`
      SELECT id, name FROM plans WHERE name IN ('gratis', 'pro');
    `;
    gratisPlanId = plans.find((p) => p.name === "gratis")!.id;
    proPlanId = plans.find((p) => p.name === "pro")!.id;

    // Pastikan owner di paket gratis
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${gratisPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;
  });

  afterAll(async () => {
    // Pastikan model stealth/glyph-cluster di-re-enable
    await adminSql`
      UPDATE ai_models
      SET enabled = true
      WHERE model_id = 'stealth/glyph-cluster';
    `;

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

  it("TEST 3.1: resolveEffectiveModel mengembalikan model free yang valid untuk akun gratis", async () => {
    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'nvidia/nemotron-3.5-lightning-free'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const resolved = await chatService.resolveEffectiveModel(ownerId);
    expect(resolved).toBe("nvidia/nemotron-3.5-lightning-free");
  });

  it("TEST 3.2: resolveEffectiveModel GRACEFUL FALLBACK jika akun gratis memiliki model Pro di config", async () => {
    // Paksa set model Pro ke bot_configs akun gratis (simulasi celah data)
    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'google/gemini-2.5-flash'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    // Sistem harus otomatis mendeteksi dan downgrade ke free model tanpa error
    const resolved = await chatService.resolveEffectiveModel(ownerId);
    expect(resolved).toBe("nvidia/nemotron-3.5-lightning-free");
  });

  it("TEST 3.3: resolveEffectiveModel mengizinkan model Pro saat owner berlangganan paket Pro aktif", async () => {
    // 1. Upgrade ke Pro
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${proPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'google/gemini-2.5-flash'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const resolved = await chatService.resolveEffectiveModel(ownerId);
    expect(resolved).toBe("google/gemini-2.5-flash");

    // Kembalikan ke gratis
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${gratisPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;
  });

  it("TEST 3.4: resolveEffectiveModel GRACEFUL FALLBACK jika model yang disetel berstatus disabled (enabled=false)", async () => {
    // Set satu model valid ke disabled
    await adminSql`
      UPDATE ai_models
      SET enabled = false
      WHERE model_id = 'stealth/glyph-cluster';
    `;

    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'stealth/glyph-cluster'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const resolved = await chatService.resolveEffectiveModel(ownerId);
    expect(resolved).toBe("nvidia/nemotron-3.5-lightning-free");

    // Re-enable
    await adminSql`
      UPDATE ai_models
      SET enabled = true
      WHERE model_id = 'stealth/glyph-cluster';
    `;
  });

  it("TEST 3.5: resolveEffectiveModel GRACEFUL FALLBACK jika selected_model_id bernilai null", async () => {
    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = null
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const resolved = await chatService.resolveEffectiveModel(ownerId);
    expect(resolved).toBe("nvidia/nemotron-3.5-lightning-free");
  });

  it("TEST 3.6: resolveEffectiveModel GRACEFUL FALLBACK jika akun Pro telah kadaluarsa (expired)", async () => {
    // Set paket Pro tapi expired
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${proPlanId}::uuid,
          status = 'active',
          current_period_end = now() - interval '5 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'google/gemini-2.5-flash'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const resolved = await chatService.resolveEffectiveModel(ownerId);
    expect(resolved).toBe("nvidia/nemotron-3.5-lightning-free");

    // Kembalikan ke gratis aktif
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${gratisPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;
  });
});
