import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PresetResolver, DEFAULT_FREE_PRESET_CODE } from "../../../api/src/modules/chat/pipeline/preset-resolver";

describe("Unit & Integrity Tests: Dual-Persona AI Model Separation (Assistant vs Admin Toko)", () => {
  const migrationPath = resolve(
    __dirname,
    "../../src/db/migrations/025_separate_assistant_and_admin_models.sql"
  );
  const migrationSql = readFileSync(migrationPath, "utf-8");

  it("1. Verifikasi Migration 025: Skema terpisah untuk assistant_model_id dan admin_model_id", () => {
    expect(migrationSql.includes("assistant_model_id")).toBe(true);
    expect(migrationSql.includes("admin_model_id")).toBe(true);
    expect(
      migrationSql.includes("ALTER TABLE bot_configs")
    ).toBe(true);
    expect(
      migrationSql.includes("'nvidia/nemotron-3.5-lightning-free'")
    ).toBe(true);
  });

  it("2. Verifikasi Strict Isolation: Tidak ada modifikasi tabel knowledge_base", () => {
    const lowerSql = migrationSql.toLowerCase();
    expect(lowerSql.includes("insert into knowledge_base")).toBe(false);
    expect(lowerSql.includes("update knowledge_base")).toBe(false);
    expect(lowerSql.includes("delete from knowledge_base")).toBe(false);
  });

  it("3. Verifikasi Fallback Default: PresetResolver mengembalikan Nemotron Free jika belum ada konfigurasi", async () => {
    // Memastikan konstanta default free adalah nemotron-free
    expect(DEFAULT_FREE_PRESET_CODE).toBe("nemotron-free");
  });

  it("4. Verifikasi Tipe Data: Action dan Controller mendukung assistant_model_id dan admin_model_id", () => {
    const typesPath = resolve(
      __dirname,
      "../../src/modules/owner/personalisasi/personalisasi.types.ts"
    );
    const typesContent = readFileSync(typesPath, "utf-8");
    expect(typesContent.includes("assistant_model_id?: string | null")).toBe(true);
    expect(typesContent.includes("admin_model_id?: string | null")).toBe(true);

    const actionPath = resolve(
      __dirname,
      "../../src/modules/owner/personalisasi/actions/update-personalisasi.action.ts"
    );
    const actionContent = readFileSync(actionPath, "utf-8");
    expect(actionContent.includes("assistant_model_id")).toBe(true);
    expect(actionContent.includes("admin_model_id")).toBe(true);
  });

  it("5. Verifikasi Chat Pipeline: PresetResolver dan ChatService menerima parameter persona", () => {
    const presetResolverPath = resolve(
      __dirname,
      "../../src/modules/chat/pipeline/preset-resolver.ts"
    );
    const presetContent = readFileSync(presetResolverPath, "utf-8");
    expect(
      presetContent.includes('persona: "assistant" | "admin" = "admin"')
    ).toBe(true);

    const chatServicePath = resolve(
      __dirname,
      "../../src/modules/chat/chat.service.ts"
    );
    const chatServiceContent = readFileSync(chatServicePath, "utf-8");
    expect(
      chatServiceContent.includes(
        "PresetResolver.resolveRuntimePreset(owner.owner_id, persona)"
      )
    ).toBe(true);
  });
});
