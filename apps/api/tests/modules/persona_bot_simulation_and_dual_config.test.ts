import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { simulatePersonaChatController } from "../../../api/src/modules/owner/personalisasi/controllers/simulate-persona-chat.controller";
import { simulatePersonaChat } from "../../../api/src/modules/owner/personalisasi/actions/simulate-persona-chat.action";
import { extractStyleAndRules } from "../../../api/src/modules/owner/personalisasi/compiler/style-rules-extractor";

describe("Unit & Integrity Tests: Persona Bot Dual Configuration & Real AI Simulation", () => {
  it("1. Verifikasi Ekspor Controller & Action Simulasi", () => {
    expect(typeof simulatePersonaChatController).toBe("function");
    expect(typeof simulatePersonaChat).toBe("function");
  });

  it("2. Verifikasi Registrasi Route POST /api/owner/personalisasi/simulate dan Rute Alias di owner.ts", () => {
    const routePath = resolve(__dirname, "../../src/routes/owner.ts");
    const routeContent = readFileSync(routePath, "utf-8");
    expect(routeContent.includes('"/personalisasi/simulate"')).toBe(true);
    expect(routeContent.includes("simulatePersonaChatController")).toBe(true);
    expect(routeContent.includes("assistant_speaking_styles")).toBe(true);
    expect(routeContent.includes("assistant_custom_rules")).toBe(true);
    // Verifikasi kedua rute onboarding detail terdaftar
    expect(routeContent.includes('"/onboarding-detail"')).toBe(true);
    expect(routeContent.includes('"/onboarding/detail"')).toBe(true);
  });

  it("3. Verifikasi Compiler & Controller Personalisasi Mendukung Dual Persona", () => {
    const controllerPath = resolve(
      __dirname,
      "../../src/modules/owner/personalisasi/controllers/update-personalisasi.controller.ts"
    );
    const controllerContent = readFileSync(controllerPath, "utf-8");
    expect(controllerContent.includes("assistant_speaking_styles")).toBe(true);
    expect(controllerContent.includes("assistant_custom_rules")).toBe(true);
    expect(controllerContent.includes("compilePersonaPrompt")).toBe(true);
  });

  it("4. Verifikasi Ekstraksi Style & Rules dari Teks Terkompilasi Database", () => {
    const sampleAssistantPrompt =
      "Kamu adalah asisten internal pribadi pemilik Toko Kopi (bidang kuliner). Bertanggung jawab atas pencatatan keuangan. Gaya Bicara: Solutif, Sigap, Informatif. Aturan Khusus: Panggil Bos dengan sebutan Raja Sang Maharaja; Jangan bocorkan data rahasia.";
    const result = extractStyleAndRules(sampleAssistantPrompt);
    expect(result.styles).toEqual(["Solutif", "Sigap", "Informatif"]);
    expect(result.rules).toEqual([
      "Panggil Bos dengan sebutan Raja Sang Maharaja",
      "Jangan bocorkan data rahasia",
    ]);

    const sampleAdminPrompt =
      "Kamu adalah asisten admin ramah Toko Kopi (bidang kuliner). Melayani pertanyaan pelanggan. Gaya Bicara: Ramah, Sopan. Aturan Khusus: Jawab jam operasional.";
    const adminResult = extractStyleAndRules(sampleAdminPrompt);
    expect(adminResult.styles).toEqual(["Ramah", "Sopan"]);
    expect(adminResult.rules).toEqual(["Jawab jam operasional"]);
  });

  it("5. Verifikasi Kepatuhan AGENTS.md: Batas Ukuran Baris (< 400 baris) pada seluruh berkas baru/modifikasi", () => {
    const filesToCheck = [
      "../../src/modules/owner/personalisasi/actions/simulate-persona-chat.action.ts",
      "../../src/modules/owner/personalisasi/controllers/simulate-persona-chat.controller.ts",
      "../../src/modules/owner/personalisasi/compiler/style-rules-extractor.ts",
      "../../src/modules/owner/personalisasi/actions/get-personalisasi.action.ts",
      "../../src/modules/owner/personalisasi/controllers/get-personalisasi.controller.ts",
      "../../src/routes/owner.ts",
      "../../../web/src/panels/users/persona-bot/PersonaBotRoot.svelte",
      "../../../web/src/panels/users/persona-bot/components/PersonaConfigForm.svelte",
      "../../../web/src/panels/users/persona-bot/components/PersonaPreviewCard.svelte",
      "../../../web/src/panels/users/persona-bot/components/AiModelSelectionCard.svelte",
    ];

    for (const relPath of filesToCheck) {
      const fullPath = resolve(__dirname, relPath);
      const content = readFileSync(fullPath, "utf-8");
      const lineCount = content.split("\n").length;
      expect(lineCount).toBeLessThan(400);
    }
  });
});
