import type { GuardrailValidationInput, GuardrailValidationResult } from "./guardrail.service";

/**
 * CustomerScopeChecker:
 * Mencegah pelanggan memanfaatkan bot toko untuk meminta pembuatan
 * kode pemrograman bebas, tugas akademik, atau pantun/hiburan santai yang tidak tercantum di Knowledge Base toko.
 */
export class CustomerScopeChecker {
  static check(
    input: GuardrailValidationInput,
    judgeModel: string
  ): GuardrailValidationResult | null {
    if (input.persona !== "admin") return null;

    const kbLower = (input.knowledgeBaseContext || "").toLowerCase();
    const userLower = (input.userMessage || "").toLowerCase();
    const draft = input.draftReply || "";

    const isRequestingCode =
      /\b(?:buatkan|kasih|minta|bikin|tuliskan|generate|tampilkan|contoh)\b[\s\S]*?\b(?:kode|code|koding|coding|script|python|rust|golang|javascript|html|css|sql)\b/i.test(userLower) ||
      /\b(?:kode|code|script|python|rust|golang|javascript)\b[\s\S]*?\b(?:buat|bikin|generate|hello\s*world|greetings)\b/i.test(userLower);

    const isRequestingPantun =
      /\b(?:buatkan|kasih|minta|bikin|tuliskan|generate|ada|bisa)\b[\s\S]*?\b(?:pantun|puisi|cerpen|lelucon|candaan)\b/i.test(userLower) ||
      /\b(?:pantun|puisi)\b[\s\S]*?\b(?:buat|bikin|dong|kak|bang|salam|greetings)\b/i.test(userLower);

    const hasCodeInDraft = /(?:```(?:python|rust|javascript|ts|js|html|css|sql|sh)?\s*[\s\S]+?```|print\s*\()/i.test(draft);

    const kbHasCode = /\b(jasa (?:coding|pemrograman|script|koding)|kursus coding|belajar python)\b/i.test(kbLower);
    const kbHasPantun = /\b(jasa pantun|pembuatan pantun|koleksi pantun)\b/i.test(kbLower);

    const business = input.businessName || "toko kami";

    if ((isRequestingCode || hasCodeInDraft) && !kbHasCode) {
      return {
        isValid: false,
        confidenceScore: 1.0,
        violationType: "inappropriate",
        actionDirective: "refuse_politely",
        critique: "Pelanggan meminta pembuatan kode pemrograman di luar layanan resmi toko.",
        reason: "Deteksi Out-of-Scope: Permintaan kode pemrograman bebas untuk pelanggan",
        correctedReply: `Mohon maaf, sebagai asisten layanan ${business}, saya hanya dapat membantu pertanyaan seputar produk dan layanan resmi kami. Apakah ada informasi seputar layanan ${business} yang bisa kami bantu?`,
        judgeModel,
      };
    }

    if (isRequestingPantun && !kbHasPantun) {
      return {
        isValid: false,
        confidenceScore: 1.0,
        violationType: "inappropriate",
        actionDirective: "refuse_politely",
        critique: "Pelanggan meminta pantun/hiburan di luar layanan resmi toko.",
        reason: "Deteksi Out-of-Scope: Permintaan pantun bebas untuk pelanggan",
        correctedReply: `Mohon maaf, sebagai asisten layanan ${business}, saya hanya dapat membantu pertanyaan seputar produk dan layanan resmi kami. Apakah ada informasi seputar layanan ${business} yang bisa kami bantu?`,
        judgeModel,
      };
    }

    return null;
  }
}
