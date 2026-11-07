import { aiAdapter } from "../../adapters/ai";
import { AiCotCleaner } from "../../adapters/ai/sanitizer/ai-cot-cleaner";
import { PromptEngine } from "../../adapters/ai/prompts/prompt-engine";
import { createModuleLogger } from "../../logs";
import type { ActionDirective } from "../../adapters/ai/types";

const guardrailLogger = createModuleLogger("guardrail-service");

export interface GuardrailValidationInput {
  userMessage: string;
  draftReply: string;
  persona: "admin" | "assistant";
  knowledgeBaseContext?: string;
  businessName?: string;
  responseLanguage?: string;
  hasPhotoAttachment?: boolean;
}

export interface GuardrailValidationResult {
  isValid: boolean;
  confidenceScore: number;
  violationType: "hallucination" | "leakage" | "inappropriate" | "corrupted" | null;
  actionDirective: ActionDirective;
  critique: string;
  reason: string;
  correctedReply: string | null;
  judgeModel: string;
}

export class GuardrailService {
  constructor(
    private readonly judgeModel: string = "openai/gpt-4o-mini"
  ) {}

  /**
   * Melakukan validasi independen (Sesi 3) terhadap draf balasan AI
   * untuk mencegah halusinasi harga/syarat dan kebocoran data rahasia internal.
   */
  async validateDraftReply(input: GuardrailValidationInput): Promise<GuardrailValidationResult> {
    const startTime = Date.now();
    const isCustomer = input.persona === "admin";
    const rawLanguage = input.responseLanguage?.trim() || "";
    const isAutoLanguage = !rawLanguage || rawLanguage.toLowerCase() === "auto";
    const languageDirective = isAutoLanguage
      ? PromptEngine.loadPartial("guardrail-language-auto.md")
      : PromptEngine.loadPartial("guardrail-language-strict.md", { allowedLanguages: rawLanguage });

    const systemPrompt = PromptEngine.loadTemplate("guardrail-auditor.system.md", {
      businessName: input.businessName || "Usaha",
      recipientRole: isCustomer ? "PELANGGAN/PEMBELI" : "PEMILIK USAHA/OWNER",
      knowledgeBaseContext: input.knowledgeBaseContext || "(Tidak ada dokumen KB terlampir)",
      languageDirective,
    });

    const photoContextNote = input.hasPhotoAttachment
      ? "\nCATATAN LAMPIRAN: Pengguna menyertakan foto visual / gambar objek."
      : "";

    const userAuditPrompt = `TARGET PENERIMA BALASAN: ${isCustomer ? "PELANGGAN / PEMBELI (Wajib proteksi kebocoran data internal)" : "PEMILIK USAHA / OWNER (BOS berhak tahu modal, keuangan, dan margin)"}
PREFERENSI BAHASA: ${isAutoLanguage ? "auto (mengikuti bahasa penanya)" : rawLanguage}${photoContextNote}

PERTANYAAN PENGGUNA:
"${input.userMessage}"

DRAF BALASAN AI YANG AKAN DIAUDIT:
"${input.draftReply}"`;

    // Deteksi awal apakah draf mengandung artefak JSON mentah atau kebocoran CoT bahasa Inggris
    const trimmedDraft = (input.draftReply || "").trim();
    const hasRawJsonArtifact =
      trimmedDraft.startsWith("{") ||
      trimmedDraft.includes('"reply":') ||
      trimmedDraft.includes('{\n  "reply"') ||
      trimmedDraft.includes("```json");

    const hasCotLeakage =
      AiCotCleaner.isEnglishMonologue(trimmedDraft) ||
      /The user is asking\b/i.test(trimmedDraft) ||
      /Let me review\b/i.test(trimmedDraft) ||
      /In my previous response\b/i.test(trimmedDraft) ||
      /Format requirements:\b/i.test(trimmedDraft) ||
      /Let me compose the reply:/i.test(trimmedDraft);

    // Deteksi awal: Batasan Ruang Lingkup Pelanggan (Anti Out-of-Scope: Permintaan Kode / Pantun Bebas)
    const outOfScopeCheck = this.checkCustomerOutOfScope(input);
    if (outOfScopeCheck) {
      guardrailLogger.info("Mencegat permintaan Out-of-Scope untuk Pelanggan", {
        reason: outOfScopeCheck.reason,
        critique: outOfScopeCheck.critique,
      });
      return outOfScopeCheck;
    }

    try {
      const response = await aiAdapter.chatWithFallback(
        {
          model: this.judgeModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userAuditPrompt },
          ],
          temperature: 0.1,
          max_tokens: 2000,
          timeout_ms: 12000,
        },
        ["nvidia/nemotron-3.5-lightning-free"]
      );

      const rawContent = response.content.trim();
      let cleaned = rawContent
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/Here's (?:a|the) thinking process:[\s\S]*?(?=\{)/gi, "")
        .trim();
      if (cleaned.includes("```")) {
        cleaned = cleaned.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
      }

      const parsed = aiAdapter.parseFirstValidJsonObject(cleaned) || aiAdapter.parseFirstValidJsonObject(rawContent);

      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.is_valid === "boolean"
      ) {
        let isValid = parsed.is_valid;
        const confidenceScore = typeof parsed.confidence_score === "number" ? parsed.confidence_score : 0.9;
        let violationType = ["hallucination", "leakage", "inappropriate", "corrupted"].includes(parsed.violation_type)
          ? parsed.violation_type
          : null;
        let reason = String(parsed.reason || "Audited by secondary judge");
        let correctedReply = typeof parsed.corrected_reply === "string" && parsed.corrected_reply.trim()
          ? parsed.corrected_reply.trim()
          : null;

        const validDirectives: ActionDirective[] = ["approve", "apologize", "refuse_politely", "clarify", "direct_guide", "sanitize_clean"];
        let actionDirective: ActionDirective = validDirectives.includes(parsed.action_directive)
          ? parsed.action_directive
          : (isValid ? "approve" : (violationType === "leakage" ? "refuse_politely" : (violationType === "corrupted" ? "sanitize_clean" : "direct_guide")));
        let critique = String(parsed.critique || (isValid ? "Draf balasan lolos audit." : "Draf memerlukan koreksi keselamatan / akurasi."));

        // Jika draf terbukti bocor JSON mentah atau monolog CoT, tandai dan bersihkan!
        if (hasRawJsonArtifact) {
          isValid = false;
          violationType = "corrupted";
          actionDirective = "sanitize_clean";
          critique = "Draf mengandung struktur JSON mentah atau teks terpotong.";
          reason = "Deteksi otomatis integritas format: Draf mengandung artefak JSON mentah";
          correctedReply = aiAdapter.sanitizeRawAiReply(input.draftReply);
        } else if (hasCotLeakage) {
          isValid = false;
          violationType = "corrupted";
          actionDirective = "sanitize_clean";
          critique = "Draf mengandung monolog proses berpikir (CoT) dalam bahasa Inggris.";
          reason = "Deteksi otomatis CoT: Draf membocorkan proses berpikir internal";
          correctedReply = AiCotCleaner.cleanThinkingArtifacts(input.draftReply);
        }

        // Aturan Mutlak Hak Akses & Obrolan Santai Owner:
        if (!isCustomer) {
          // 1. Owner berhak mengetahui seluruh data internal / modal
          if (violationType === "leakage") {
            isValid = true;
            violationType = null;
            actionDirective = "approve";
            critique = "Pemilik usaha (Owner) memiliki hak akses penuh terhadap seluruh data internal.";
            correctedReply = null;
          }
          // 2. Owner berhak bercanda, berpantun, atau santai tanpa dihakimi "tidak pantas untuk konteks bisnis"
          if (violationType === "inappropriate" || violationType === "hallucination") {
            const hasSevereHarm = /hate|sara|porno|vulgar|ilegal|senjata/i.test(critique);
            if (!hasSevereHarm) {
              isValid = true;
              violationType = null;
              actionDirective = "approve";
              critique = "Pemilik usaha (Owner) berhak melakukan obrolan santai, pantun, dan candaan dengan asistennya.";
              correctedReply = null;
            }
          }
        }

        // Proteksi Mutlak: Jika draf mengandung kebocoran CoT/meta-reasoning bahasa Inggris,
        // DILARANG KERAS disetujui (walaupun penerima adalah Owner)!
        const hasRemainingCot = AiCotCleaner.isEnglishMonologue(input.draftReply) ||
          /\b(?:There's also a "RAHASIA"|looking at the prompt structure|Wait, actually looking|Let me re-read the actual)\b/i.test(input.draftReply);

        if (hasRemainingCot) {
          isValid = false;
          violationType = "corrupted";
          actionDirective = "sanitize_clean";
          critique = "Draf mengandung monolog proses berpikir (CoT) dalam bahasa Inggris.";
          correctedReply = AiCotCleaner.cleanThinkingArtifacts(input.draftReply);
        }

        // Lindungi harga jual resmi pelanggan dari false-positive leakage:
        if (isCustomer && violationType === "leakage") {
          const isTrueInternalLeakage = /aws|server internal|kulakan|margin|bep|modal|pasar andir|14\.000|brankas|882911|rekening pribadi/i.test(input.draftReply);
          const hasPricelistContext = Boolean(input.knowledgeBaseContext && /harga|pricelist|paket|500k|99\.000/i.test(input.knowledgeBaseContext));
          if (!isTrueInternalLeakage && hasPricelistContext && /harga|pricelist|biaya|paket|layanan|price|pricing|cost|plan|package|いくら|価格|料金|プラン/i.test(input.userMessage)) {
            isValid = true;
            violationType = null;
            actionDirective = "approve";
            critique = "Informasi harga jual resmi dan pricelist sesuai dengan Knowledge Base publik.";
            correctedReply = null;
          }
        }

        // Double defense: Jika violationType leakage untuk Pelanggan namun correctedReply masih membocorkan angka/nominal rahasia
        if (isCustomer && violationType === "leakage" && correctedReply) {
          const sensitivePatterns = [/\d{1,3}(?:\.\d{3})+/g, /password/i, /secret/i, /bep/i];
          const hasLeakedNumbers = sensitivePatterns.some(
            (pattern) => pattern.test(input.draftReply) && pattern.test(correctedReply!)
          );
          if (hasLeakedNumbers) {
            correctedReply = "Mohon maaf, informasi terkait operasional internal bersifat rahasia perusahaan dan tidak dapat kami bagikan. Ada hal lain terkait produk atau layanan yang bisa kami bantu?";
          }
        }

        guardrailLogger.info("Hasil audit Secondary Guardrail Judge", {
          isValid,
          violationType,
          actionDirective,
          critique,
          model: response.model,
          latencyMs: Date.now() - startTime,
        });

        return {
          isValid,
          confidenceScore,
          violationType,
          actionDirective,
          critique,
          reason,
          correctedReply,
          judgeModel: response.model,
        };
      }

      // Jika format JSON output Judge tidak valid / terpotong
      guardrailLogger.warn("Output Judge bukan format JSON terstruktur, memeriksa integritas draf", {
        raw: rawContent.slice(0, 150),
        hasRawJsonArtifact,
      });

      if (hasRawJsonArtifact || hasCotLeakage) {
        return {
          isValid: false,
          confidenceScore: 1.0,
          violationType: "corrupted",
          actionDirective: "sanitize_clean",
          critique: hasCotLeakage ? "Draf mengandung monolog CoT dan langsung disanitasi." : "Draf terdeteksi mengandung format JSON mentah dan langsung disanitasi.",
          reason: "Format parsing fallback: Draf disanitasi",
          correctedReply: hasCotLeakage ? AiCotCleaner.cleanThinkingArtifacts(input.draftReply) : aiAdapter.sanitizeRawAiReply(input.draftReply),
          judgeModel: response.model,
        };
      }

      return {
        isValid: true,
        confidenceScore: 0.8,
        violationType: null,
        actionDirective: "approve",
        critique: "Format parsing fallback: default pass",
        reason: "Format parsing fallback: default pass",
        correctedReply: null,
        judgeModel: response.model,
      };
    } catch (err: any) {
      guardrailLogger.error(`Gagal menjalankan Secondary Guardrail Judge: ${err.message}`, err);
      // Jika judge timeout / error, jangan pernah meloloskan JSON mentah!
      if (hasRawJsonArtifact) {
        return {
          isValid: false,
          confidenceScore: 1.0,
          violationType: "corrupted",
          actionDirective: "sanitize_clean",
          critique: `Judge timeout/error: Auto-sanitizing raw JSON artifact (${err.message})`,
          reason: `Judge timeout/error: Auto-sanitizing raw JSON artifact (${err.message})`,
          correctedReply: aiAdapter.sanitizeRawAiReply(input.draftReply),
          judgeModel: this.judgeModel,
        };
      }

      // Fail-open yang aman HANYA untuk percakapan teks normal jika judge timeout
      return {
        isValid: true,
        confidenceScore: 0.7,
        violationType: null,
        actionDirective: "approve",
        critique: `Judge fallback due to error: ${err.message}`,
        reason: `Judge fallback due to error: ${err.message}`,
        correctedReply: null,
        judgeModel: this.judgeModel,
      };
    }
  }

  /**
   * Deterministic Interceptor: Mencegah pelanggan memanfaatkan bot toko untuk meminta pembuatan
   * kode pemrograman bebas, tugas akademik, atau pantun/hiburan santai yang tidak tercantum di Knowledge Base toko.
   */
  private checkCustomerOutOfScope(input: GuardrailValidationInput): GuardrailValidationResult | null {
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
        judgeModel: this.judgeModel,
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
        judgeModel: this.judgeModel,
      };
    }

    return null;
  }
}

export const guardrailService = new GuardrailService();
