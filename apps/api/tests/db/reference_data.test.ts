import { describe, it, expect } from "bun:test";
import { adminSql, withContext } from "../../src/db/client";

describe("Part D: Reference Data Check & withContext Helper Verification", () => {
  it("Reference-data check: plans, default account template and ai_models tables/data exist after migrate", async () => {
    // 1. Verify plans exist (created in 010_billing_plans.sql)
    const plans = await adminSql<{ name: string; price: string }[]>`
      SELECT name, price FROM plans ORDER BY name;
    `;
    expect(plans.length).toBeGreaterThanOrEqual(2);
    const gratis = plans.find((p) => p.name === "gratis");
    const pro = plans.find((p) => p.name === "pro");
    expect(gratis).toBeDefined();
    expect(pro).toBeDefined();

    // 2. Verify default_accounts_template exists with COA templates across all business types
    const templates = await adminSql<{ business_type: string; count: string }[]>`
      SELECT business_type, count(*)::text as count
      FROM default_accounts_template
      GROUP BY business_type;
    `;
    expect(templates.length).toBeGreaterThanOrEqual(4);
    const types = templates.map((t) => t.business_type);
    expect(types).toContain("kuliner");
    expect(types).toContain("toko");
    expect(types).toContain("jasa");
    expect(types).toContain("lainnya");

    // 3. Verify ai_models table exists with required schema including currency
    const aiColumns = await adminSql<{ column_name: string; data_type: string }[]>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_models';
    `;
    expect(aiColumns.length).toBeGreaterThanOrEqual(7);
    const colNames = aiColumns.map((c) => c.column_name);
    expect(colNames).toContain("model_id");
    expect(colNames).toContain("provider");
    expect(colNames).toContain("tier");
    expect(colNames).toContain("currency");
    expect(colNames).toContain("price_input_per_1m");
    expect(colNames).toContain("price_output_per_1m");
  });

  describe("withContext({ role, ownerId, userId }, fn) Unified Helper", () => {
    it("withContext with role 'owner' sets owner context and session GUCs", async () => {
      const dummyOwnerId = "00000000-0000-0000-0000-000000000011";
      const dummyUserId = "00000000-0000-0000-0000-000000000010";

      const res = await withContext(
        { role: "owner", ownerId: dummyOwnerId, userId: dummyUserId },
        async (tx) => {
          const [row] = await tx<{
            role: string;
            app_owner: string;
            app_user: string;
          }[]>`
            SELECT 
              current_setting('role', true) as role,
              current_setting('app.owner_id', true) as app_owner,
              current_setting('app.user_id', true) as app_user;
          `;
          return row;
        }
      );

      expect(res.role).toBe("meseid_owner_ctx");
      expect(res.app_owner).toBe(dummyOwnerId);
      expect(res.app_user).toBe(dummyUserId);
    });

    it("withContext with role 'admin' sets admin context and clears owner_id", async () => {
      const dummyAdminId = "00000000-0000-0000-0000-000000000001";

      const res = await withContext(
        { role: "admin", userId: dummyAdminId },
        async (tx) => {
          const [row] = await tx<{
            role: string;
            app_owner: string;
            app_user: string;
          }[]>`
            SELECT 
              current_setting('role', true) as role,
              current_setting('app.owner_id', true) as app_owner,
              current_setting('app.user_id', true) as app_user;
          `;
          return row;
        }
      );

      expect(res.role).toBe("meseid_admin_ctx");
      expect(res.app_user).toBe(dummyAdminId);
      expect(res.app_owner).toBe("");
    });

    it("withContext with role 'system' sets system context and clears user/owner", async () => {
      const res = await withContext({ role: "system" }, async (tx) => {
        const [row] = await tx<{
          role: string;
          app_owner: string;
          app_user: string;
        }[]>`
          SELECT 
            current_setting('role', true) as role,
            current_setting('app.owner_id', true) as app_owner,
            current_setting('app.user_id', true) as app_user;
        `;
        return row;
      });

      expect(res.role).toBe("meseid_system_ctx");
      expect(res.app_owner).toBe("");
      expect(res.app_user).toBe("");
    });
  });
});
