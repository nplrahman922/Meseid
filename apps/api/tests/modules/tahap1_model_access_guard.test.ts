import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { withSystemContext } from "../../src/db/client";
import {
  getOwnerSubscriptionInfo,
  validateModelAccessForOwner,
  getAvailableModelsForOwner,
  ModelAccessError,
} from "../../src/modules/owner/personalisasi/model-access.guard";

describe("Tahap 1: Model Access Guard & Subscription Tier Validation", () => {
  let gratisOwnerId: string;
  let proPlanId: string;
  let gratisPlanId: string;

  beforeAll(async () => {
    await withSystemContext(async (tx) => {
      // Dapatkan owner gratis yang sudah ada di database (Jasting)
      const [owner] = await tx<{ id: string }[]>`
        SELECT id FROM owners LIMIT 1;
      `;
      gratisOwnerId = owner.id;

      const plans = await tx<{ id: string; name: string }[]>`
        SELECT id, name FROM plans WHERE name IN ('gratis', 'pro');
      `;
      gratisPlanId = plans.find((p) => p.name === "gratis")!.id;
      proPlanId = plans.find((p) => p.name === "pro")!.id;

      // Pastikan status langganan saat ini aktif di gratis
      await tx`
        UPDATE subscriptions
        SET plan_id = ${gratisPlanId}::uuid,
            status = 'active',
            current_period_end = now() + interval '30 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;
    });
  });

  afterAll(async () => {
    // Kembalikan subscription ke gratis aktif
    await withSystemContext(async (tx) => {
      await tx`
        UPDATE subscriptions
        SET plan_id = ${gratisPlanId}::uuid,
            status = 'active',
            current_period_end = now() + interval '30 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;
    });
  });

  it("TEST 1.1: Akun dengan paket gratis sukses memvalidasi model bertier 'free'", async () => {
    await withSystemContext(async (tx) => {
      const result = await validateModelAccessForOwner(
        tx,
        gratisOwnerId,
        "nvidia/nemotron-3.5-lightning-free"
      );

      expect(result.allowed).toBe(true);
      expect(result.model.tier).toBe("free");
      expect(result.subscription.plan_name).toBe("gratis");
      expect(result.subscription.is_pro).toBe(false);
    });
  });

  it("TEST 1.2: Akun dengan paket gratis DITOLAK (403 Forbidden) saat memilih model bertier 'pro'", async () => {
    await withSystemContext(async (tx) => {
      try {
        await validateModelAccessForOwner(
          tx,
          gratisOwnerId,
          "google/gemini-2.5-flash"
        );
        expect.unreachable("Seharusnya melempar ModelAccessError 403");
      } catch (err: any) {
        expect(err).toBeInstanceOf(ModelAccessError);
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe("TIER_INSUFFICIENT");
        expect(err.message).toContain("hanya tersedia untuk pengguna Paket Pro");
      }
    });
  });

  it("TEST 1.3: Akun dengan paket pro aktif SUKSES memilih baik model 'free' maupun 'pro'", async () => {
    await withSystemContext(async (tx) => {
      // Simulasikan upgrade ke pro aktif
      await tx`
        UPDATE subscriptions
        SET plan_id = ${proPlanId}::uuid,
            status = 'active',
            current_period_end = now() + interval '30 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;

      // 1. Sukses pilih model pro
      const proResult = await validateModelAccessForOwner(
        tx,
        gratisOwnerId,
        "google/gemini-2.5-flash"
      );
      expect(proResult.allowed).toBe(true);
      expect(proResult.model.tier).toBe("pro");
      expect(proResult.subscription.is_pro).toBe(true);

      // 2. Sukses pilih model free
      const freeResult = await validateModelAccessForOwner(
        tx,
        gratisOwnerId,
        "nvidia/nemotron-3.5-lightning-free"
      );
      expect(freeResult.allowed).toBe(true);
      expect(freeResult.model.tier).toBe("free");

      // Kembalikan ke gratis
      await tx`
        UPDATE subscriptions
        SET plan_id = ${gratisPlanId}::uuid,
            status = 'active',
            current_period_end = now() + interval '30 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;
    });
  });

  it("TEST 1.4: Upaya memilih model yang tidak ada atau disabled ditolak dengan 400 Bad Request", async () => {
    await withSystemContext(async (tx) => {
      // 1. Model fiktif
      try {
        await validateModelAccessForOwner(
          tx,
          gratisOwnerId,
          "non-existent-provider/fake-model-xyz"
        );
        expect.unreachable("Seharusnya melempar ModelAccessError 400");
      } catch (err: any) {
        expect(err).toBeInstanceOf(ModelAccessError);
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe("MODEL_NOT_FOUND");
      }

      // 2. Model string kosong
      try {
        await validateModelAccessForOwner(tx, gratisOwnerId, "   ");
        expect.unreachable("Seharusnya melempar ModelAccessError 400");
      } catch (err: any) {
        expect(err).toBeInstanceOf(ModelAccessError);
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe("INVALID_MODEL_ID");
      }
    });
  });

  it("TEST 1.5: Akun pro yang masa berlakunya kadaluarsa (expired) ditolak memilih model Pro", async () => {
    await withSystemContext(async (tx) => {
      // Set status pro tapi current_period_end sudah di masa lalu
      await tx`
        UPDATE subscriptions
        SET plan_id = ${proPlanId}::uuid,
            status = 'active',
            current_period_end = now() - interval '2 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;

      try {
        await validateModelAccessForOwner(
          tx,
          gratisOwnerId,
          "google/gemini-2.5-flash"
        );
        expect.unreachable("Seharusnya melempar ModelAccessError 403 karena expired");
      } catch (err: any) {
        expect(err).toBeInstanceOf(ModelAccessError);
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe("TIER_INSUFFICIENT");
      }

      // Kembalikan ke gratis aktif
      await tx`
        UPDATE subscriptions
        SET plan_id = ${gratisPlanId}::uuid,
            status = 'active',
            current_period_end = now() + interval '30 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;
    });
  });

  it("TEST 1.6: getAvailableModelsForOwner menandai is_accessible secara presisi sesuai tier", async () => {
    await withSystemContext(async (tx) => {
      // Kondisi akun gratis
      const catalogGratis = await getAvailableModelsForOwner(tx, gratisOwnerId);
      expect(catalogGratis.subscription.is_pro).toBe(false);

      const accessibleForGratis = catalogGratis.models.filter((m) => m.is_accessible);
      const lockedForGratis = catalogGratis.models.filter((m) => !m.is_accessible);

      // Seluruh model accessible harus tier free
      for (const m of accessibleForGratis) {
        expect(m.tier).toBe("free");
      }
      // Seluruh model locked harus tier pro
      for (const m of lockedForGratis) {
        expect(m.tier).toBe("pro");
      }

      // Kondisi akun pro
      await tx`
        UPDATE subscriptions
        SET plan_id = ${proPlanId}::uuid,
            status = 'active',
            current_period_end = now() + interval '30 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;

      const catalogPro = await getAvailableModelsForOwner(tx, gratisOwnerId);
      expect(catalogPro.subscription.is_pro).toBe(true);

      // Pada akun pro, seluruh model aktif harus is_accessible = true
      const allAccessible = catalogPro.models.every((m) => m.is_accessible === true);
      expect(allAccessible).toBe(true);

      // Kembalikan ke gratis
      await tx`
        UPDATE subscriptions
        SET plan_id = ${gratisPlanId}::uuid,
            status = 'active',
            current_period_end = now() + interval '30 days'
        WHERE owner_id = ${gratisOwnerId}::uuid;
      `;
    });
  });
});
