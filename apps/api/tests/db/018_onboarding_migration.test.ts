import { describe, it, expect } from "bun:test";
import { adminSql } from "../../src/db/client";

describe("Tahap 1: Database Migration 018 Onboarding Enhancements", () => {
  it("should have added phone, custom_business_type, business_description, and onboarding_completed to owners", async () => {
    const columns = await adminSql<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }[]>`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'owners'
      ORDER BY column_name;
    `;

    const colMap = new Map(columns.map((c) => [c.column_name, c]));

    expect(colMap.has("phone")).toBe(true);
    expect(colMap.get("phone")?.data_type).toBe("text");

    expect(colMap.has("custom_business_type")).toBe(true);
    expect(colMap.get("custom_business_type")?.data_type).toBe("text");

    expect(colMap.has("business_description")).toBe(true);
    expect(colMap.get("business_description")?.data_type).toBe("text");

    expect(colMap.has("onboarding_completed")).toBe(true);
    expect(colMap.get("onboarding_completed")?.data_type).toBe("boolean");
    expect(colMap.get("onboarding_completed")?.is_nullable).toBe("NO");
  });

  it("should have added is_internal to knowledge_base and removed category check constraint", async () => {
    const columns = await adminSql<{ column_name: string; data_type: string; is_nullable: string }[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'knowledge_base' AND column_name = 'is_internal';
    `;

    expect(columns.length).toBe(1);
    expect(columns[0].data_type).toBe("boolean");
    expect(columns[0].is_nullable).toBe("NO");

    const constraints = await adminSql<{ conname: string }[]>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'knowledge_base'::regclass
        AND conname = 'knowledge_base_category_check';
    `;

    expect(constraints.length).toBe(0);
  });

  it("should verify docs_sync consistency", async () => {
    const columns = await adminSql`
      SELECT c.relname as table_name, a.attname as column_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r' 
        AND a.attnum > 0 
        AND NOT a.attisdropped
        AND c.relname IN ('owners', 'knowledge_base')
        AND a.attname IN ('phone', 'custom_business_type', 'business_description', 'onboarding_completed', 'is_internal');
    `;

    expect(columns.length).toBe(5);
  });
});
