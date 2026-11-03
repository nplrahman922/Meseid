import { describe, it, expect } from "bun:test";
import { withSystemContext } from "../src/db/client";
import {
  getAvailableModelsForOwner,
  validateModelAccessForOwner,
  ModelAccessError,
} from "../src/modules/owner/personalisasi/model-access.guard";

describe("Model Selection & Subscription Access Guard Tests", () => {
  it("harus mengembalikan daftar model teruji yang terurut dengan metadata lengkap", async () => {
    await withSystemContext(async (tx) => {
      const [owner] = await tx<{ id: string }[]>`SELECT id FROM owners LIMIT 1`;
      expect(owner).toBeDefined();

      const result = await getAvailableModelsForOwner(tx, owner.id);
      expect(result.models.length).toBeGreaterThanOrEqual(10);

      // Pastikan model unggulan teruji ada di daftar
      const modelIds = result.models.map((m) => m.model_id);
      expect(modelIds).toContain("google/gemini-2.5-flash");
      expect(modelIds).toContain("openai/gpt-4o-mini");
      expect(modelIds).toContain("reflection/beam-free");
      expect(modelIds).toContain("deepseek/deepseek-r1");

      // Periksa kelengkapan metadata
      const beamFree = result.models.find((m) => m.model_id === "reflection/beam-free")!;
      expect(beamFree.jenis).toBe("Gratis");
      expect(beamFree.tier).toBe("free");
      expect(beamFree.is_accessible).toBe(true);
      expect(beamFree.score).toBeGreaterThan(90);

      const gemini = result.models.find((m) => m.model_id === "google/gemini-2.5-flash")!;
      expect(gemini.jenis).toBe("Berbayar");
      expect(gemini.tier).toBe("pro");
      expect(gemini.score).toBeGreaterThan(90);
    });
  });

  it("pemilik paket Pro harus memiliki is_accessible = true untuk model Pro dan Gratis", async () => {
    await withSystemContext(async (tx) => {
      // Cari atau uji owner yang memiliki subscription Pro yang masih aktif & belum expired
      const [proSub] = await tx<{ owner_id: string }[]>`
        SELECT s.owner_id
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE p.name = 'pro' AND s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
        LIMIT 1;
      `;

      if (proSub) {
        const result = await getAvailableModelsForOwner(tx, proSub.owner_id);
        expect(result.subscription.is_pro).toBe(true);

        // Akun Pro bisa akses model 2-2 nya (Gratis dan Pro)
        const freeModel = result.models.find((m) => m.tier === "free")!;
        const proModel = result.models.find((m) => m.tier === "pro")!;
        expect(freeModel.is_accessible).toBe(true);
        expect(proModel.is_accessible).toBe(true);

        // Validasi tidak boleh lempar error
        const validation = await validateModelAccessForOwner(
          tx,
          proSub.owner_id,
          "google/gemini-2.5-flash"
        );
        expect(validation.allowed).toBe(true);
      }
    });
  });

  it("pemilik paket Gratis hanya bisa akses model Gratis dan DILARANG akses model Pro", async () => {
    await withSystemContext(async (tx) => {
      // Dummy owner UUID yang tidak punya subscription Pro
      const dummyFreeOwnerId = "00000000-0000-0000-0000-000000000001";

      const result = await getAvailableModelsForOwner(tx, dummyFreeOwnerId);
      expect(result.subscription.is_pro).toBe(false);

      // Model gratis harus accessible
      const freeModels = result.models.filter((m) => m.tier === "free");
      expect(freeModels.length).toBeGreaterThan(0);
      for (const m of freeModels) {
        expect(m.is_accessible).toBe(true);
      }

      // Model pro HARUS TIDAK accessible (is_accessible = false)
      const proModels = result.models.filter((m) => m.tier === "pro");
      expect(proModels.length).toBeGreaterThan(0);
      for (const m of proModels) {
        expect(m.is_accessible).toBe(false);
      }

      // Jika mencoba validate model Pro, backend wajib melempar ModelAccessError 403 TIER_INSUFFICIENT
      try {
        await validateModelAccessForOwner(tx, dummyFreeOwnerId, "google/gemini-2.5-flash");
        expect(true).toBe(false); // tidak boleh sampai sini
      } catch (err: any) {
        expect(err).toBeInstanceOf(ModelAccessError);
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe("TIER_INSUFFICIENT");
      }

      // Tetapi jika memilih model Gratis, harus sukses!
      const validFree = await validateModelAccessForOwner(
        tx,
        dummyFreeOwnerId,
        "reflection/beam-free"
      );
      expect(validFree.allowed).toBe(true);
    });
  });
});
