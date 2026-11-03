import { describe, it, expect, beforeAll } from "bun:test";
import { aiAdapter } from "../../src/adapters/ai";
import { withSystemContext } from "../../src/db/client";
import {
  upsertAiModels,
  getAiModelsList,
  updateModelEnabledStatus,
} from "../../src/modules/admin/admin.model";

describe("Tahap 1 Test Suite: AI Adapter & PostgreSQL Model Layer", () => {
  it("aiAdapter.syncModelsWithVercel fetches and parses Vercel models with proper pricing and tiers", async () => {
    const result = await aiAdapter.syncModelsWithVercel({ maxRetries: 2, retryDelayMs: 500 });
    expect(result.success).toBe(true);
    expect(result.total_fetched).toBeGreaterThan(50);
    expect(result.total_synced).toBeGreaterThan(50);
    expect(result.total_free).toBeGreaterThan(0);
    expect(result.total_pro).toBeGreaterThan(0);
    expect(result.models.length).toBe(result.total_synced);

    const sample = result.models[0];
    expect(sample.provider).toBeDefined();
    expect(sample.model_id).toBeDefined();
    expect(["free", "pro"]).toContain(sample.tier);
    expect(sample.currency).toBe("IDR");
    expect(typeof sample.price_input_per_1m).toBe("number");
    expect(typeof sample.price_output_per_1m).toBe("number");
  }, 15000);

  it("aiAdapter.fetchModelsWithRetry returns catalog data without error", async () => {
    const models = await aiAdapter.fetchModelsWithRetry(2, 500);
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(50);
  }, 15000);

  it("upsertAiModels successfully inserts and updates models into PostgreSQL ai_models", async () => {
    await withSystemContext(async (tx) => {
      const mockModels = [
        {
          provider: "test-provider",
          model_id: "test/model-free-001",
          tier: "free" as const,
          currency: "IDR",
          enabled: true,
          price_input_per_1m: 0,
          price_output_per_1m: 0,
        },
        {
          provider: "test-provider",
          model_id: "test/model-pro-002",
          tier: "pro" as const,
          currency: "IDR",
          enabled: true,
          price_input_per_1m: 2500,
          price_output_per_1m: 7500,
        },
      ];

      const upsertedCount = await upsertAiModels(tx, mockModels);
      expect(upsertedCount).toBe(2);

      const allModels = await getAiModelsList(tx);
      expect(allModels.some((m) => m.model_id === "test/model-free-001")).toBe(true);
      expect(allModels.some((m) => m.model_id === "test/model-pro-002")).toBe(true);

      const freeFiltered = await getAiModelsList(tx, { tier: "free" });
      expect(freeFiltered.every((m) => m.tier === "free")).toBe(true);

      // Test status update
      const updated = await updateModelEnabledStatus(tx, "test/model-pro-002", false);
      expect(updated).toBe(true);

      const [proModel] = await tx`
        SELECT enabled FROM ai_models WHERE model_id = 'test/model-pro-002';
      `;
      expect(proModel.enabled).toBe(false);

      // Cleanup mock models
      await tx`DELETE FROM ai_models WHERE provider = 'test-provider';`;
    });
  });

  it("aiAdapter.probeModelHealth checks model responsiveness", async () => {
    // Probing free model
    const health = await aiAdapter.probeModelHealth("minimax/minimax-m3.1-flash", 6000);
    expect(health).toBeDefined();
    expect(typeof health.healthy).toBe("boolean");
    expect(typeof health.latency_ms).toBe("number");
  }, 15000);
});
