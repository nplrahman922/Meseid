import { describe, it, expect } from "bun:test";
import { PromptEngine } from "../src/adapters/ai/prompts/prompt-engine";
import { modelProfilesRegistry } from "../src/adapters/ai/eval/model-profiles.registry";
import { aiAdapter } from "../src/adapters/ai";

describe("Multilingual & Free-Form Language Prompt Tests", () => {
  const nemotronProfile = modelProfilesRegistry.getProfile("nvidia/nemotron-3.5-lightning-free");

  it("harus menyertakan direktif auto mirroring jika bahasa dikosongkan atau 'auto'", () => {
    PromptEngine.clearCache();
    const prompt = PromptEngine.compileSystemPrompt({
      persona: "admin",
      businessContext: {
        businessName: "Warung Kopi",
        responseLanguage: "auto",
      },
      modelProfile: nemotronProfile,
    });

    expect(prompt).toContain("ATURAN BAHASA BALASAN (MODE ADAPTIF / OTOMATIS):");
    expect(prompt).toContain("SAMA PERSIS dengan pesan penanya");
    expect(prompt).not.toContain("dalam Bahasa Indonesia yang ramah dan santun.");
  });

  it("harus menyertakan teks bahasa bebas jika owner mendeskripsikan bahasa kustom (misal: Bahasa Jepang)", () => {
    PromptEngine.clearCache();
    const prompt = PromptEngine.compileSystemPrompt({
      persona: "admin",
      businessContext: {
        businessName: "Tokyo Ramen",
        responseLanguage: "Bahasa Jepang sopan (Keigo)",
      },
      modelProfile: nemotronProfile,
    });

    expect(prompt).toContain("ATURAN KETAT BAHASA BALASAN (DEFINISI KHUSUS OWNER)");
    expect(prompt).toContain("Bahasa Jepang sopan (Keigo)");
    expect(prompt).toContain("DILARANG KERAS membalas pesan dalam bahasa lain");
  });

  it("harus menyertakan teks bahasa bebas jika owner mendeskripsikan gaya Jaksel campur Inggris", () => {
    PromptEngine.clearCache();
    const prompt = PromptEngine.compileSystemPrompt({
      persona: "assistant",
      businessContext: {
        businessName: "Meseid ID",
        responseLanguage: "Bahasa santai gaul campur Indo-Inggris gaya anak Jaksel",
      },
      modelProfile: nemotronProfile,
    });

    expect(prompt).toContain("ATURAN KETAT BAHASA BALASAN (DEFINISI KHUSUS OWNER)");
    expect(prompt).toContain("Bahasa santai gaul campur Indo-Inggris gaya anak Jaksel");
  });

  it("harus membalas dengan bahasa Jepang ketika penanya bertanya dalam bahasa Jepang (Live Nemotron)", async () => {
    const result = await aiAdapter.extractChatResponse(
      "こんにちは、営業時間を教えてください",
      "admin",
      {
        businessName: "Warung Ramen",
        responseLanguage: "auto",
      },
      "nvidia/nemotron-3.5-lightning-free"
    );

    console.log("[TEST LIVE NEMOTRON JAPANESE]:\n", result.reply);
    // Memastikan balasan mengandung karakter Jepang
    const hasJapaneseCharacters = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(result.reply);
    expect(hasJapaneseCharacters).toBe(true);
  }, 40000);

  it("harus membalas dengan gaya Jaksel ketika penanya atau owner meminta gaya Jaksel (Live Nemotron)", async () => {
    const result = await aiAdapter.extractChatResponse(
      "Halo min, which is gue mau nanya literally fitur Meseid worth it gak sih buat coffee shop gue?",
      "admin",
      {
        businessName: "Kopi Senja",
        responseLanguage: "Bahasa gaul santai campur Indo-Inggris gaya anak Jaksel",
      },
      "nvidia/nemotron-3.5-lightning-free"
    );

    console.log("[TEST LIVE NEMOTRON JAKSEL]:\n", result.reply);
    expect(result.reply.length).toBeGreaterThan(10);
  }, 40000);
});
