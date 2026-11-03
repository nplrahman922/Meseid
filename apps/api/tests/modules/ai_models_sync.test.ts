import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src/index";
import { adminSql } from "../../src/db/client";
import { signSession } from "../../src/lib/session";
import { aiAdapter } from "../../src/adapters/ai";
import {
  executeAiModelSyncJob,
  checkAndRunStartupSync,
  startAiModelSyncScheduler,
} from "../../src/lib/scheduler";

describe("Unified AI Models Sync & 24-Hour Scheduler Test Suite (End-to-End)", () => {
  let adminToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    const [admin] = await adminSql`SELECT id, email, role FROM users WHERE email = 'nplrahman922@gmail.com';`;
    const [owner] = await adminSql`SELECT id, email, role FROM users WHERE email = 'nplrahman992@gmail.com';`;
    const [ownerEnt] = await adminSql`SELECT id FROM owners WHERE user_id = ${owner.id};`;

    adminToken = signSession({
      userId: admin.id,
      role: "admin",
      email: admin.email,
    });

    ownerToken = signSession({
      userId: owner.id,
      ownerId: ownerEnt.id,
      role: "owner",
      email: owner.email,
    });
  });

  // 1. Adapter Layer
  describe("1. Adapter Layer & Vercel AI Gateway", () => {
    it("fetches, classifies, and converts token pricing to IDR per 1M tokens", async () => {
      const syncResult = await aiAdapter.syncModelsWithVercel({ maxRetries: 2, retryDelayMs: 500 });
      expect(syncResult.success).toBe(true);
      expect(syncResult.total_fetched).toBeGreaterThan(100);
      expect(syncResult.total_free).toBeGreaterThan(0);
      expect(syncResult.total_pro).toBeGreaterThan(0);

      const first = syncResult.models[0];
      expect(first.provider).toBeDefined();
      expect(first.currency).toBe("IDR");
      expect(typeof first.price_input_per_1m).toBe("number");
    });

    it("probes health of an active model with minimal prompt", async () => {
      const health = await aiAdapter.probeModelHealth("minimax/minimax-m3.1-flash", 6000);
      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe("boolean");
      expect(health.latency_ms).toBeGreaterThan(0);
    });
  });

  // 2. Admin On-Demand Endpoint (Opsi 3)
  describe("2. Admin On-Demand Endpoints (Opsi 3)", () => {
    it("rejects unauthorized and non-admin requests", async () => {
      const unauth = await app.handle(new Request("http://localhost/api/admin/ai/sync", { method: "POST" }));
      expect(unauth.status).toBe(401);

      const forbidden = await app.handle(
        new Request("http://localhost/api/admin/ai/sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${ownerToken}` },
        })
      );
      expect(forbidden.status).toBe(403);
    });

    it("allows admin to trigger POST /api/admin/ai/sync and records to admin_audit_log", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/ai/sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.total_synced).toBeGreaterThan(100);

      const [audit] = await adminSql`
        SELECT action, reason, metadata 
        FROM admin_audit_log 
        WHERE action = 'SYNC_AI_MODELS' 
        ORDER BY created_at DESC 
        LIMIT 1;
      `;
      expect(audit).toBeDefined();
      expect(audit.action).toBe("SYNC_AI_MODELS");
    });

    it("allows admin to query GET /api/admin/ai/models with tier filter", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/admin/ai/models?tier=free", {
          method: "GET",
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.models.length).toBeGreaterThan(0);
      expect(json.models.every((m: any) => m.tier === "free")).toBe(true);
    });

    it("allows admin to toggle model enabled state via PATCH /api/admin/ai/models/toggle", async () => {
      const [model] = await adminSql`SELECT model_id, enabled FROM ai_models LIMIT 1;`;
      const targetId = model.model_id;
      const toggled = !model.enabled;

      const res = await app.handle(
        new Request("http://localhost/api/admin/ai/models/toggle", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ model_id: targetId, enabled: toggled }),
        })
      );
      expect(res.status).toBe(200);

      const [after] = await adminSql`SELECT enabled FROM ai_models WHERE model_id = ${targetId};`;
      expect(after.enabled).toBe(toggled);

      // Revert back
      await adminSql`UPDATE ai_models SET enabled = ${model.enabled} WHERE model_id = ${targetId};`;
    });
  });

  // 3. Periodic Scheduler (Opsi 1)
  describe("3. Background Scheduler (Opsi 1)", () => {
    it("runs background sync in system context and records to system_logs", async () => {
      const jobResult = await executeAiModelSyncJob();
      expect(jobResult.success).toBe(true);
      expect(jobResult.total_synced).toBeGreaterThan(100);

      const [log] = await adminSql`
        SELECT code, component, level
        FROM system_logs
        WHERE code = 'AI_MODELS_SYNC_SUCCESS'
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      expect(log).toBeDefined();
      expect(log.code).toBe("AI_MODELS_SYNC_SUCCESS");
    });

    it("evaluates startup freshness and starts/stops scheduler cleanly", () => {
      const handle = startAiModelSyncScheduler(24);
      expect(handle.isRunning()).toBe(true);
      handle.stop();
      expect(handle.isRunning()).toBe(false);
    });
  });
});
