import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src/index";
import { adminSql } from "../../src/db/client";
import { signSession } from "../../src/lib/session";

describe("Tahap 2 Test Suite: Admin AI Endpoints & RBAC Security", () => {
  let adminToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    // Get existing admin and owner from database
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

  it("Unauthenticated request to POST /api/admin/ai/sync returns 401 UNAUTHORIZED", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/ai/sync", {
        method: "POST",
      })
    );
    expect(res.status).toBe(401);
    const json = (await res.json()) as any;
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("Owner role request to POST /api/admin/ai/sync returns 403 FORBIDDEN", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/ai/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      })
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error).toBe("FORBIDDEN");
  });

  it("Admin role request to POST /api/admin/ai/sync successfully triggers sync and updates database", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/ai/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.total_fetched).toBeGreaterThan(50);
    expect(json.total_synced).toBeGreaterThan(50);
    expect(json.total_free).toBeGreaterThan(0);
    expect(json.total_pro).toBeGreaterThan(0);

    // Verify database row count
    const [count] = await adminSql`SELECT count(*) FROM ai_models;`;
    expect(Number(count.count)).toBeGreaterThanOrEqual(json.total_synced);

    // Verify admin_audit_log entry
    const [audit] = await adminSql`
      SELECT action, reason, metadata 
      FROM admin_audit_log 
      WHERE action = 'SYNC_AI_MODELS' 
      ORDER BY created_at DESC 
      LIMIT 1;
    `;
    expect(audit).toBeDefined();
    expect(audit.action).toBe("SYNC_AI_MODELS");
    expect(audit.metadata.total_synced).toBe(json.total_synced);
  }, 20000);

  it("Admin request to GET /api/admin/ai/models returns list of synced models", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/ai/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(Array.isArray(json.models)).toBe(true);
    expect(json.total).toBeGreaterThan(50);

    // Test tier filter
    const resFree = await app.handle(
      new Request("http://localhost/api/admin/ai/models?tier=free", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
    );
    expect(resFree.status).toBe(200);
    const jsonFree = (await resFree.json()) as any;
    expect(jsonFree.models.every((m: any) => m.tier === "free")).toBe(true);
  });

  it("Admin request to PATCH /api/admin/ai/models/toggle updates model enabled status", async () => {
    // Pick first model to toggle
    const [sample] = await adminSql`SELECT model_id, enabled FROM ai_models LIMIT 1;`;
    const targetModelId = sample.model_id;
    const newStatus = !sample.enabled;

    const res = await app.handle(
      new Request("http://localhost/api/admin/ai/models/toggle", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          model_id: targetModelId,
          enabled: newStatus,
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.enabled).toBe(newStatus);

    // Verify DB
    const [updated] = await adminSql`SELECT enabled FROM ai_models WHERE model_id = ${targetModelId};`;
    expect(updated.enabled).toBe(newStatus);

    // Restore status
    await adminSql`UPDATE ai_models SET enabled = ${sample.enabled} WHERE model_id = ${targetModelId};`;
  });
});
