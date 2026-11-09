import { aiAdapter } from "../../../adapters/ai";
import { AiCotCleaner } from "../../../adapters/ai/sanitizer/ai-cot-cleaner";
import { guardrailService, type GuardrailValidationResult } from "../guardrail.service";
import { createModuleLogger } from "../../../logs";
import type { ExtractedChatResponse } from "../../../adapters/ai/types";
import { withSystemContext } from "../../../db/client";
import {
  recordUnansweredQuestionAction,
  type RejectionReason,
} from "../../owner/kb/actions/record-unanswered-question.action";

const orchestratorLogger = createModuleLogger("discussion-orchestrator");

export interface DiscussionInput {
  userMessage: string;
  persona: "assistant" | "admin";
  owner: {
    owner_id: string;
    business_name: string;
    business_type: string;
  };
  chatContext: {
    botName: string;
    knowledgeBaseContext: string;
    customPersonaPrompt: string;
    responseLanguage?: string;
  };
  memory: {
    memoryDigest?: string;
    recentTurns: any[];
  };
  effectiveModel: string;
  channel?: string;
  preset?: {
    model_id: string;
    temperature: number;
    max_tokens: number;
    confidence_threshold: number;
    supports_vision: boolean;
    supports_audio: boolean;
    supports_web_search: boolean;
    fallback_model_id: string | null;
  };
  attachments?: any[];
}

export interface DiscussionResult {
  reply: string;
  aiResult: ExtractedChatResponse;
  audit: GuardrailValidationResult;
  roundsCount: number;
}

/**
 * DiscussionOrchestrator:
 * Mengoordinasikan Metode AI Diskusi (Multi-Agent Critique & Refine Loop)
 * antara Generator AI dan Critic/Auditor AI sebelum balasan dikirimkan.
 */
export class DiscussionOrchestrator {
  private static async recordUnansweredSafely(
    ownerId: string,
    questionText: string,
    options?: { channel?: string; reason?: RejectionReason }
  ): Promise<void> {
    try {
      await withSystemContext(async (tx) => {
        await recordUnansweredQuestionAction(tx, ownerId, questionText, options);
      });
    } catch (err: any) {
      orchestratorLogger.warn("Gagal merekam unanswered question:", { error: err.message });
    }
  }

  static async executeDiscussionLoop(input: DiscussionInput): Promise<DiscussionResult> {
    const startTime = Date.now();
    const isCustomer = input.persona === "admin";
    const hasPhotoAttachment = Boolean(
      input.attachments?.some(
        (a) => a.file_type === "photo" || a.mime_type?.startsWith("image/")
      )
    );

    const runtimeOptions = {
      temperature: input.preset?.temperature,
      maxTokens: input.preset?.max_tokens,
      attachments: input.attachments,
    };

    // 1. Putaran 1: Generator AI menghasilkan Draf Awal
    let aiResult = await aiAdapter.extractChatResponse(
      input.userMessage,
      input.persona,
      {
        businessName: input.owner.business_name,
        businessType: input.owner.business_type,
        botName: input.chatContext.botName,
        knowledgeBaseContext: input.chatContext.knowledgeBaseContext,
        memoryDigest: input.memory.memoryDigest,
        customPersonaPrompt: input.chatContext.customPersonaPrompt,
        responseLanguage: input.chatContext.responseLanguage,
        recentTurns: input.memory.recentTurns,
      },
      input.effectiveModel,
      runtimeOptions
    );

    let draftReply = AiCotCleaner.cleanThinkingArtifacts(aiResult.reply);

    // 2. Sesi Evaluasi: Critic / Auditor AI menginspeksi Draf Awal
    let audit = await guardrailService.validateDraftReply({
      userMessage: input.userMessage,
      draftReply,
      persona: input.persona,
      knowledgeBaseContext: input.chatContext.knowledgeBaseContext,
      businessName: input.owner.business_name,
      responseLanguage: input.chatContext.responseLanguage,
      hasPhotoAttachment,
      customPersonaPrompt: input.chatContext.customPersonaPrompt,
    });

    // 3. Jika Auditor Menyetujui (Valid) -> Selesai dalam 1 Putaran
    if (audit.isValid) {
      orchestratorLogger.info("Metode AI Diskusi: Draf 1 lolos audit", {
        persona: input.persona,
        latencyMs: Date.now() - startTime,
      });
      return {
        reply: draftReply,
        aiResult,
        audit,
        roundsCount: 1,
      };
    }

    // 4. Jika Penolakan Kerahasiaan untuk Pelanggan (Customer Data Leakage)
    // Langsung gunakan pesan penolakan santun tanpa perlu putaran diskusi ulang
    if (isCustomer && audit.actionDirective === "refuse_politely" && audit.correctedReply) {
      orchestratorLogger.info("Metode AI Diskusi: Perlindungan rahasia data pelanggan dieksekusi", {
        critique: audit.critique,
      });

      // PEREKAMAN FASE 2: Penolakan Instan Keamanan / Kebocoran / Out-of-Scope
      const reason: RejectionReason =
        audit.violationType === "leakage"
          ? "leakage"
          : audit.violationType === "inappropriate"
          ? "out_of_scope"
          : "jailbreak";

      await this.recordUnansweredSafely(input.owner.owner_id, input.userMessage, {
        channel: input.channel,
        reason,
      });

      return {
        reply: audit.correctedReply,
        aiResult,
        audit,
        roundsCount: 1,
      };
    }

    // 4b. Jika Terjadi Kerusakan Format / Kebocoran CoT dan Auditor sudah memiliki perbaikan bersih
    if (audit.actionDirective === "sanitize_clean" && audit.correctedReply && !AiCotCleaner.isEnglishMonologue(audit.correctedReply)) {
      orchestratorLogger.info("Metode AI Diskusi: Sanitasi CoT/format berhasil dieksekusi", {
        critique: audit.critique,
      });
      return {
        reply: audit.correctedReply,
        aiResult,
        audit,
        roundsCount: 1,
      };
    }

    // 5. Putaran 2: Dialog Diskusi & Regenerasi Terarah (Critique & Refine)
    orchestratorLogger.warn(
      `[AI-DISKUSI] Draf 1 ditolak (${audit.violationType}). Memulai putaran diskusi koreksi: ${audit.critique}`,
      {
        ownerId: input.owner.owner_id,
        violationType: audit.violationType,
        critique: audit.critique,
      }
    );

    const langInstruction = input.chatContext.responseLanguage && input.chatContext.responseLanguage !== "auto"
      ? `dalam format/bahasa: ${input.chatContext.responseLanguage}`
      : "sesuai bahasa/dialek penanya";

    const isFreeTier = input.effectiveModel.includes("free") || input.effectiveModel.includes("nemotron");
    const critiquePrompt = isFreeTier
      ? `${input.userMessage}\n\n(Catatan: Berikan jawaban langsung ${langInstruction} yang santun, tanpa proses berpikir)`
      : `${input.userMessage}\n\n[Instruksi Revisi: Jawab langsung permintaan pengguna di atas secara ramah, lengkap, dan rapi ${langInstruction}. Catatan perbaikan: ${audit.critique}. DILARANG menyertakan proses berpikir internal atau mengulang teks instruksi ini.]`;

    try {
      const refinedResult = await aiAdapter.extractChatResponse(
        critiquePrompt,
        input.persona,
        {
          businessName: input.owner.business_name,
          businessType: input.owner.business_type,
          botName: input.chatContext.botName,
          knowledgeBaseContext: input.chatContext.knowledgeBaseContext,
          customPersonaPrompt: input.chatContext.customPersonaPrompt,
          responseLanguage: input.chatContext.responseLanguage,
          recentTurns: input.memory.recentTurns,
        },
        input.effectiveModel,
        runtimeOptions
      );

      let finalReply = AiCotCleaner.cleanThinkingArtifacts(refinedResult.reply);

      // LANGKAH 4: Auditor AI Memvalidasi Ulang Draf 2 (Audit Putaran 2)
      const auditRound2 = await guardrailService.validateDraftReply({
        userMessage: input.userMessage,
        draftReply: finalReply,
        persona: input.persona,
        knowledgeBaseContext: input.chatContext.knowledgeBaseContext,
        businessName: input.owner.business_name,
        responseLanguage: input.chatContext.responseLanguage,
        hasPhotoAttachment,
        customPersonaPrompt: input.chatContext.customPersonaPrompt,
      });

      // 4A. Jika Draf 2 Lolos Audit -> Kirim Draf 2
      if (auditRound2.isValid && !AiCotCleaner.isEnglishMonologue(finalReply)) {
        orchestratorLogger.info("Metode AI Diskusi: Draf 2 sukses lolos validasi ulang (Langkah 4)", {
          roundsCount: 2,
          totalLatencyMs: Date.now() - startTime,
        });
        return {
          reply: finalReply,
          aiResult: refinedResult,
          audit: auditRound2,
          roundsCount: 2,
        };
      }

      // 4B. Jika Draf 2 MASIH GAGAL -> Jalankan Graceful Rejection Fallback
      orchestratorLogger.warn(
        `[AI-DISKUSI] Draf 2 tetap tidak valid (${auditRound2.violationType}). Mengaktifkan Graceful Fallback.`,
        {
          ownerId: input.owner.owner_id,
          violationType: auditRound2.violationType,
          critique: auditRound2.critique,
        }
      );

      // PEREKAMAN FASE 4: Kegagalan Putaran 2 (Missing KB / Ambiguous / Fallback)
      if (isCustomer) {
        const reason: RejectionReason =
          auditRound2.violationType === "hallucination"
            ? "missing_kb"
            : auditRound2.violationType === "leakage"
            ? "leakage"
            : "fallback";

        await this.recordUnansweredSafely(input.owner.owner_id, input.userMessage, {
          channel: input.channel,
          reason,
        });
      }

      // Prioritas 1: Gunakan correctedReply dari Auditor jika ada dan bersih
      if (auditRound2.correctedReply && !AiCotCleaner.isEnglishMonologue(auditRound2.correctedReply)) {
        return {
          reply: auditRound2.correctedReply,
          aiResult: refinedResult,
          audit: auditRound2,
          roundsCount: 2,
        };
      }

      const sapaanMatch = input.chatContext.customPersonaPrompt?.match(/sapaan(?:\s+hormat)?\s*["“']([^"”']+)["”']/i);
      const ownerSalutation = sapaanMatch ? sapaanMatch[1] : "Tuan Muda";

      // Prioritas 2: Balasan penolakan santun / pengakuan keterbatasan sistem sesuai persona
      const gracefulFallbackReply = isCustomer
        ? "Mohon maaf Kak, saat ini kami belum dapat memberikan informasi yang akurat mengenai hal tersebut. Silakan tanyakan hal lain seputar produk atau layanan resmi kami ya Kak."
        : `Mohon maaf ${ownerSalutation}, asisten sedang mengalami sedikit kendala dalam merumuskan balasan yang tepat untuk permintaan ini. Apakah ada kebutuhan bisnis atau hal lain yang bisa asisten bantu?`;

      return {
        reply: gracefulFallbackReply,
        aiResult: refinedResult,
        audit: auditRound2,
        roundsCount: 2,
      };
    } catch (refineErr: any) {
      orchestratorLogger.error(`Gagal pada putaran diskusi AI: ${refineErr.message}`, refineErr);
      const sapaanMatch = input.chatContext.customPersonaPrompt?.match(/sapaan(?:\s+hormat)?\s*["“']([^"”']+)["”']/i);
      const ownerSalutation = sapaanMatch ? sapaanMatch[1] : "Tuan Muda";

      const safeEmergencyReply = isCustomer
        ? "Mohon maaf Kak, sistem kami sedang mengalami sedikit gangguan. Silakan coba sesaat lagi ya."
        : `Mohon maaf ${ownerSalutation}, terjadi sedikit gangguan koneksi pada sistem asisten saat memproses balasan.`;
      return {
        reply: safeEmergencyReply,
        aiResult,
        audit,
        roundsCount: 1,
      };
    }
  }
}
