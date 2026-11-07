import { describe, it, expect, beforeEach } from "bun:test";
import { PromptEngine } from "../../src/adapters/ai/prompts/prompt-engine";

describe("Fitur Bahasa Balasan: Pemisahan Markdown & Penegakan Mode Strict", () => {
  beforeEach(() => {
    PromptEngine.clearCache();
  });

  it("loadPartial harus membaca berkas markdown dan mensubstitusi variabel dengan tepat", () => {
    const autoContent = PromptEngine.loadPartial("response-language-auto.md");
    expect(autoContent).toContain("ATURAN BAHASA BALASAN (MODE ADAPTIF / OTOMATIS)");
    expect(autoContent).toContain("SAMA PERSIS dengan pesan penanya");

    const strictContent = PromptEngine.loadPartial("response-language-strict.md", {
      allowedLanguages: '"Bahasa Indonesia" , "Bahasa Sunda"',
    });
    expect(strictContent).toContain("ATURAN KETAT BAHASA BALASAN (DEFINISI KHUSUS OWNER)");
    expect(strictContent).toContain('"Bahasa Indonesia" , "Bahasa Sunda"');
    expect(strictContent).toContain("DILARANG KERAS membalas pesan dalam bahasa lain");
  });

  it("compileSystemPrompt pada mode auto harus menyertakan arahan adaptif bebas", () => {
    const prompt = PromptEngine.compileSystemPrompt({
      persona: "assistant",
      businessContext: {
        businessName: "Toko EnBee",
        responseLanguage: "auto",
      },
    });

    expect(prompt).toContain("MODE ADAPTIF / OTOMATIS");
    expect(prompt).toContain("Bahasa Jepang");
    expect(prompt).toContain("Jaksel");
    expect(prompt).not.toContain("ATURAN KETAT BAHASA BALASAN");
  });

  it("compileSystemPrompt saat responseLanguage kosong/undefined harus default ke mode auto", () => {
    const prompt = PromptEngine.compileSystemPrompt({
      persona: "admin",
      businessContext: {
        businessName: "Toko EnBee",
      },
    });

    expect(prompt).toContain("MODE ADAPTIF / OTOMATIS");
    expect(prompt).not.toContain("ATURAN KETAT BAHASA BALASAN");
  });

  it("compileSystemPrompt pada mode strict harus menyertakan larangan keras dan daftar bahasa yang diizinkan", () => {
    const customLang = '"Bahasa Indonesia" , "Bahasa Sunda" , "Bahasa Inggris"';
    const prompt = PromptEngine.compileSystemPrompt({
      persona: "assistant",
      businessContext: {
        businessName: "Toko EnBee",
        responseLanguage: customLang,
      },
    });

    expect(prompt).toContain("ATURAN KETAT BAHASA BALASAN (DEFINISI KHUSUS OWNER)");
    expect(prompt).toContain(customLang);
    expect(prompt).toContain("DILARANG KERAS membalas pesan dalam bahasa lain apa pun di luar daftar tersebut");
    expect(prompt).toContain("utamakan Bahasa Indonesia atau Bahasa Inggris jika bahasa penanya tidak dikenali");
    expect(prompt).not.toContain("MODE ADAPTIF / OTOMATIS");
  });

  it("guardrail partials harus menyediakan direktif yang tepat untuk auditor", () => {
    const autoGuardrail = PromptEngine.loadPartial("guardrail-language-auto.md");
    expect(autoGuardrail).toContain("Mode Otomatis (Auto-Detect)");
    expect(autoGuardrail).toContain("WAJIB disetujui");

    const strictGuardrail = PromptEngine.loadPartial("guardrail-language-strict.md", {
      allowedLanguages: "Bahasa Indonesia",
    });
    expect(strictGuardrail).toContain("Instruksi Khusus Owner: AI HANYA diizinkan menjawab");
    expect(strictGuardrail).toContain("Bahasa Indonesia");
    expect(strictGuardrail).toContain("violation_type = \"inappropriate\"");
  });
});
