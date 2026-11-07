import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { DEFAULT_TESTED_MODELS } from "../../../web/src/panels/users/persona-bot/persona-bot.constants";

describe("Unit & Integrity Tests: Next-Gen AI Presets (Gemini 3.8 Flash & Qwen 3.8 Omni)", () => {
  const migrationPath = resolve(
    __dirname,
    "../../src/db/migrations/024_add_next_gen_ai_presets.sql"
  );
  const migrationSql = readFileSync(migrationPath, "utf-8");

  it("1. Verifikasi Migration 024: Memuat definisi lengkap Gemini 3.8 Flash dan Qwen 3.8 Omni", () => {
    // Memastikan preset_code terdaftar
    expect(migrationSql.includes("'gemini-38-flash'")).toBe(true);
    expect(migrationSql.includes("'google/gemini-3.8-flash'")).toBe(true);
    expect(migrationSql.includes("'qwen-38-omni'")).toBe(true);
    expect(migrationSql.includes("'alibaba/qwen3.8-omni-flash'")).toBe(true);
    expect(migrationSql.includes("'gemini-pro-reasoning'")).toBe(true);

    // Memastikan kapabilitas Gemini 3.8 Flash lengkap
    expect(migrationSql.includes("supports_vision: AKTIF")).toBe(true);
    expect(migrationSql.includes("supports_audio: AKTIF")).toBe(true);
    expect(migrationSql.includes("supports_web_search: AKTIF")).toBe(true);
    expect(migrationSql.includes("supports_reasoning: AKTIF")).toBe(true);

    // Memastikan kapabilitas Qwen 3.8 Omni (web search nonaktif)
    expect(
      migrationSql.includes(
        "supports_web_search: NONAKTIF (tanpa web search bawaan gateway)"
      )
    ).toBe(true);
  });

  it("2. Verifikasi Strict Isolation: Tidak ada modifikasi tabel knowledge_base atau bot_configs", () => {
    // Memastikan tabel knowledge_base dan bot_configs TIDAK dimodifikasi di migrasi
    const lowerSql = migrationSql.toLowerCase();
    expect(lowerSql.includes("insert into knowledge_base")).toBe(false);
    expect(lowerSql.includes("update knowledge_base")).toBe(false);
    expect(lowerSql.includes("delete from knowledge_base")).toBe(false);
    expect(lowerSql.includes("insert into bot_configs")).toBe(false);
    expect(lowerSql.includes("delete from bot_configs")).toBe(false);
  });

  it("3. Verifikasi Frontend Constants: DEFAULT_TESTED_MODELS memuat 7 model teruji dengan atribut valid", () => {
    expect(DEFAULT_TESTED_MODELS.length).toBe(7);

    const gemini38 = DEFAULT_TESTED_MODELS.find(
      (m) => m.preset_code === "gemini-38-flash"
    );
    expect(gemini38).toBeDefined();
    expect(gemini38?.model_id).toBe("google/gemini-3.8-flash");
    expect(gemini38?.supports_vision).toBe(true);
    expect(gemini38?.supports_audio).toBe(true);
    expect(gemini38?.supports_web_search).toBe(true);
    expect(gemini38?.supports_reasoning).toBe(true);
    expect(gemini38?.badge).toBe("Generasi Terbaru & Cepat");

    const qwen38 = DEFAULT_TESTED_MODELS.find(
      (m) => m.preset_code === "qwen-38-omni"
    );
    expect(qwen38).toBeDefined();
    expect(qwen38?.model_id).toBe("alibaba/qwen3.8-omni-flash");
    expect(qwen38?.supports_vision).toBe(true);
    expect(qwen38?.supports_audio).toBe(true);
    expect(qwen38?.supports_web_search).toBe(false);
    expect(qwen38?.supports_reasoning).toBe(true);
    expect(qwen38?.badge).toBe("Multimodal Super Hemat");

    const geminiPro = DEFAULT_TESTED_MODELS.find(
      (m) => m.preset_code === "gemini-pro-reasoning"
    );
    expect(geminiPro).toBeDefined();
    expect(geminiPro?.model_id).toBe("google/gemini-2.5-pro");
    expect(geminiPro?.supports_web_search).toBe(true);
  });
});
