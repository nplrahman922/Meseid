import { aiAdapter } from "../../adapters/ai";
import { createModuleLogger } from "../../logs";
import type { ActionDirective } from "../../adapters/ai/types";

const guardrailLogger = createModuleLogger("guardrail-service");

export interface GuardrailValidationInput {
  userMessage: string;
  draftReply: string;
  persona: "admin" | "assistant";
  knowledgeBaseContext?: string;
  businessName?: string;
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

    const systemPrompt = `Kamu adalah Auditor AI Keamanan, Integritas Informasi, & Penasihat Respon untuk bisnis UMKM "${input.businessName || "Usaha"}".
Tugasmu adalah memvalidasi DRAF BALASAN AI yang akan dikirimkan ke ${isCustomer ? "PELANGGAN/PEMBELI" : "PEMILIK USAHA/OWNER"}.

INFORMASI RESMI KNOWLEDGE BASE:
${input.knowledgeBaseContext || "(Tidak ada dokumen KB terlampir)"}

ATURAN AUDIT KETAT BERDASARKAN PENERIMA:
1. JIKA PENERIMA ADALAH PEMILIK USAHA/OWNER:
   - Pemilik usaha adalah BOS dan mitra kerja utama. Pemilik BERHAK menanyakan topik apa saja: pembukuan, data rahasia internal (biaya modal kulakan, margin laba, biaya server), serta bantuan umum serbaguna (seperti penulisan kode Python/HTML, analisis ide, strategi bisnis, atau sains).
   - DILARANG KERAS menandai "hallucination" hanya karena topik tersebut tidak ada di Knowledge Base toko!
   - DILARANG KERAS menandai "leakage" jika penerima adalah PEMILIK USAHA/OWNER! Membuka data modal atau margin kepada bos adalah HAK pemilik usaha dan WAJIB disetujui (is_valid = true, action_directive = "approve").
   - Asisten diperbolehkan memberikan saran atau asumsi di luar KB kepada Owner dengan catatan transparansi.
2. JIKA PENERIMA ADALAH PELANGGAN/PEMBELI:
   - ANTI-HALUSINASI KETAT: Draf balasan TIDAK BOLEH mengarang harga paket, diskon fiktif, garansi fiktif, atau syarat yang bertentangan dengan Knowledge Base resmi (violation_type = "hallucination", action_directive = "direct_guide").
   - ATURAN KEBOCORAN DATA: Dilarang keras membocorkan biaya server internal AWS, target margin/BEP, data keuangan rahasia, atau SOP rahasia kepada pelanggan (violation_type = "leakage", action_directive = "refuse_politely").
3. KESESUAIAN PERTANYAAN: Draf balasan harus relevan dan menjawab pertanyaan pengguna secara sopan.
4. INTEGRITAS FORMAT & ANTI-CORRUPTED JSON: Draf balasan harus berupa teks percakapan alami manusia yang siap dikirim. Draf TIDAK BOLEH mengandung sintaks mentah JSON seperti '{"reply":', kurung kurawal pembuka {, tanda petik JSON, atau respons terpotong. Jika draf balasan mengandung kode/sintaks JSON mentah, is_valid = false (violation_type = "corrupted", action_directive = "sanitize_clean"), dan berikan "corrected_reply" berupa teks bersih manusia tanpa kurung kurawal atau sintaks kode.

KLASIFIKASI "action_directive":
- "approve": Draf balasan sudah aman, benar, dan sopan (is_valid = true).
- "apologize": Draf gagal atau informasi yang dicari belum tersedia di sistem/KB, instruksikan meminta maaf secara santun.
- "refuse_politely": Draf melanggar kerahasiaan data internal ke pelanggan, tolak secara sopan dan lindungi data rahasia. PENTING: Pada corrected_reply JANGAN PERNAH menyebutkan angka atau nominal atau rincian rahasia yang bocor! Cukup nyatakan dengan sopan bahwa informasi internal tersebut bersifat rahasia dan tidak dapat dibagikan.
- "clarify": Pertanyaan pengguna terlalu ambigu, instruksikan menanyakan detail lebih lanjut.
- "direct_guide": Draf mengarang harga/fitur, arahkan ke daftar paket resmi yang tercantum di Knowledge Base.
- "sanitize_clean": Draf rusak akibat format JSON mentah/terpotong, bersihkan ke teks percakapan alami.

KEMBALIKAN HANYA SATU OBJEK JSON MURNI tanpa markdown apapun dengan format:
{
  "is_valid": true,
  "confidence_score": 0.95,
  "violation_type": null,
  "action_directive": "approve",
  "critique": "Draf balasan akurat dan sopan.",
  "reason": "Penjelasan singkat hasil audit",
  "corrected_reply": null
}

CATATAN:
- Jika is_valid adalah false karena ada pelanggaran, sertakan "violation_type" ("hallucination", "leakage", "inappropriate", atau "corrupted"), tentukan "action_directive", tuliskan "critique" (evaluasi kekurangan draf), serta susun "corrected_reply" konsensus terbaik yang ramah dan siap dikirim ke pengguna.
- Jika draf balasan sudah aman dan benar, is_valid = true, violation_type = null, action_directive = "approve", critique = "Lolos validasi", dan corrected_reply = null.`;

    const userAuditPrompt = `PERTANYAAN PENGGUNA:
"${input.userMessage}"

DRAF BALASAN AI YANG AKAN DIAUDIT:
"${input.draftReply}"`;

    // Deteksi awal apakah draf mengandung artefak JSON mentah atau teks terpotong
    const trimmedDraft = (input.draftReply || "").trim();
    const hasRawJsonArtifact =
      trimmedDraft.startsWith("{") ||
      trimmedDraft.includes('"reply":') ||
      trimmedDraft.includes('{\n  "reply"') ||
      trimmedDraft.includes("```json");

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

        // Jika draf terbukti bocor JSON mentah namun judge meloloskannya secara keliru, override!
        if (hasRawJsonArtifact) {
          isValid = false;
          violationType = "corrupted";
          actionDirective = "sanitize_clean";
          critique = "Draf mengandung struktur JSON mentah atau teks terpotong.";
          reason = "Deteksi otomatis integritas format: Draf mengandung artefak JSON mentah";
          correctedReply = aiAdapter.sanitizeRawAiReply(input.draftReply);
        }

        // Double defense: Jika violationType leakage namun correctedReply masih membocorkan angka/nominal rahasia
        if (violationType === "leakage" && correctedReply) {
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

      if (hasRawJsonArtifact) {
        return {
          isValid: false,
          confidenceScore: 1.0,
          violationType: "corrupted",
          actionDirective: "sanitize_clean",
          critique: "Draf terdeteksi mengandung format JSON mentah dan langsung disanitasi.",
          reason: "Format parsing fallback: Draf mengandung JSON mentah dan langsung disanitasi",
          correctedReply: aiAdapter.sanitizeRawAiReply(input.draftReply),
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
}

export const guardrailService = new GuardrailService();
