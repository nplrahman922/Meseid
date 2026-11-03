import { aiAdapter } from "../../../adapters/ai";
import { AiCotCleaner } from "../../../adapters/ai/sanitizer/ai-cot-cleaner";
import { guardrailService, type GuardrailValidationResult } from "../guardrail.service";
import { createModuleLogger } from "../../../logs";
import type { ExtractedChatResponse } from "../../../adapters/ai/types";

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
  };
  memory: {
    memoryDigest?: string;
    recentTurns: any[];
  };
  effectiveModel: string;
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
  static async executeDiscussionLoop(input: DiscussionInput): Promise<DiscussionResult> {
    const startTime = Date.now();
    const isCustomer = input.persona === "admin";

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
        recentTurns: input.memory.recentTurns,
      },
      input.effectiveModel
    );

    let draftReply = AiCotCleaner.cleanThinkingArtifacts(aiResult.reply);

    // 2. Sesi Evaluasi: Critic / Auditor AI menginspeksi Draf Awal
    let audit = await guardrailService.validateDraftReply({
      userMessage: input.userMessage,
      draftReply,
      persona: input.persona,
      knowledgeBaseContext: input.chatContext.knowledgeBaseContext,
      businessName: input.owner.business_name,
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

    const critiquePrompt = `${input.userMessage}\n\n[Instruksi Revisi: Jawab langsung permintaan pengguna di atas secara ramah, lengkap, dan rapi dalam Bahasa Indonesia. Catatan perbaikan: ${audit.critique}. DILARANG menyertakan proses berpikir bahasa Inggris atau mengulang teks instruksi ini.]`;

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
          recentTurns: input.memory.recentTurns,
        },
        input.effectiveModel
      );

      let finalReply = AiCotCleaner.cleanThinkingArtifacts(refinedResult.reply);

      // Safety Guard: Jika draf Putaran 2 masih mengandung monolog CoT/meta-reasoning bahasa Inggris
      if (/^(?:The user is asking|Write a new reply|The improvement direction|So the auditor|This is contradictory)\b/i.test(finalReply)) {
        orchestratorLogger.warn("[AI-DISKUSI] Draf Putaran 2 gagal membersihkan CoT. Menggunakan fallback draf asli yang disanitasi.");
        finalReply = AiCotCleaner.cleanThinkingArtifacts(draftReply);
      }

      orchestratorLogger.info("Metode AI Diskusi: Draf 2 berhasil disempurnakan", {
        roundsCount: 2,
        totalLatencyMs: Date.now() - startTime,
      });

      return {
        reply: finalReply,
        aiResult: refinedResult,
        audit,
        roundsCount: 2,
      };
    } catch (refineErr: any) {
      orchestratorLogger.error(`Gagal pada putaran diskusi AI: ${refineErr.message}`, refineErr);
      // Fallback ke draf pertama yang sudah dibersihkan atau corrected reply
      const fallbackReply = audit.correctedReply || draftReply;
      return {
        reply: fallbackReply,
        aiResult,
        audit,
        roundsCount: 1,
      };
    }
  }
}
