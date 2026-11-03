import { aiAdapter } from "../../adapters/ai";
import { guardrailService } from "./guardrail.service";
import { createModuleLogger } from "../../logs";
import type { InboundMessageInput, ProcessInboundResponse } from "./chat.schema";
import { InboundRecorder } from "./pipeline/inbound-recorder";
import { OwnerResolver, type ChannelOwnerResolution } from "./pipeline/owner-resolver";
import { ContextLoader } from "./pipeline/context-loader";
import { MemoryWindowReader } from "./pipeline/memory-window.reader";
import { BookkeepingPersister } from "./pipeline/bookkeeping-persister";
import { ChatPersister } from "./pipeline/chat-persister";

const chatLogger = createModuleLogger("chat-service");

export class ChatService {
  /**
   * Menentukan persona ('assistant' untuk Owner, 'admin' untuk Pelanggan).
   * Fleksibel menerima (payload, owner) atau (owner, payload).
   */
  determinePersona(
    arg1: any,
    arg2: any
  ): "assistant" | "admin" {
    const payload = arg1?.channel ? arg1 : arg2;
    const owner = arg1?.owner_id ? arg1 : arg2;
    return OwnerResolver.determinePersona(payload, owner);
  }

  /**
   * Resolusi model efektif berdasarkan subscription tier dan ketersediaan model gratis.
   * Delegasi ke OwnerResolver.
   */
  async resolveEffectiveModel(ownerId: string): Promise<string> {
    return OwnerResolver.resolveEffectiveModel(ownerId);
  }

  /**
   * Main Pipeline Coordinator untuk pemrosesan pesan inbound chat.
   */
  async processInboundMessage(payload: InboundMessageInput): Promise<ProcessInboundResponse> {
    const startTime = Date.now();
    const rawUserMessage = payload.text?.trim() || "";
    const quotedText = payload.quoted_text?.trim();
    const userMessage = quotedText
      ? `[Membalas pesan]: "${quotedText}"\n\n[Pesan Pengguna]: ${rawUserMessage}`
      : rawUserMessage;

    // 1. Multi-tenant Owner Resolution
    const owner = await OwnerResolver.resolveOrBindOwner(payload);
    if (!owner) {
      return {
        status: "ignored",
        reply_text: "",
        reason: "unregistered_channel",
      };
    }

    // 2. Idempotency & Inbound Record (dengan owner_id terdaftar)
    const check = await InboundRecorder.recordOrCheckInboundMessage(payload, owner.owner_id);
    if (!check.shouldProcess) {
      return {
        status: "ignored",
        reply_text: "",
        reason: check.reason,
      };
    }

    // 3. Persona Detection
    const persona = this.determinePersona(payload, owner);
    const isOwner = persona === "assistant";

    if (!userMessage) {
      await ChatPersister.markInboundFailed(payload, "empty_message");
      return {
        status: "success",
        reply_text:
          persona === "assistant"
            ? "Halo Bos! Ada yang bisa saya bantu catat untuk pembukuan hari ini?"
            : `Halo! Selamat datang di ${owner.business_name}. Ada yang bisa kami bantu?`,
      };
    }

    // 4. Model Resolution
    const effectiveModel = await this.resolveEffectiveModel(owner.owner_id);

    // 5. Muat Konteks Knowledge Base & Persona
    const chatContext = await ContextLoader.loadChatContext(owner, isOwner);

    // 6. Memory Window & Simpan Pesan User
    const memory = await MemoryWindowReader.processUserMemory(payload, owner.owner_id, isOwner, persona);

    // 7. Sesi 2: Primary Generator AI
    let aiResult;
    try {
      aiResult = await aiAdapter.extractChatResponse(
        userMessage,
        persona,
        {
          businessName: owner.business_name,
          businessType: owner.business_type,
          botName: chatContext.botName,
          knowledgeBaseContext: chatContext.knowledgeBaseContext,
          memoryDigest: memory.memoryDigest,
          customPersonaPrompt: chatContext.customPersonaPrompt,
          recentTurns: memory.recentTurns,
        },
        effectiveModel
      );
    } catch (aiErr: any) {
      chatLogger.error(`Gagal memanggil AI: ${aiErr.message}`, aiErr, {
        channel: payload.channel,
        senderId: payload.sender_id,
      });

      await ChatPersister.markInboundFailed(payload, aiErr.message);

      return {
        status: "error",
        reply_text:
          "Mohon maaf, sistem AI asisten sedang mengalami kendala jaringan. Data belum tersimpan. Silakan coba kirim kembali.",
        error: aiErr.message,
      };
    }

    // 8. Sesi 3: Secondary AI Guardrail Judge & Action Directive
    let finalReply = aiResult.reply;
    try {
      const guardrailCheck = await guardrailService.validateDraftReply({
        userMessage,
        draftReply: aiResult.reply,
        persona,
        knowledgeBaseContext: chatContext.knowledgeBaseContext,
        businessName: owner.business_name,
      });

      if (!guardrailCheck.isValid && guardrailCheck.correctedReply) {
        chatLogger.warn(
          `Guardrail Judge mengoreksi draf AI [Directive: ${guardrailCheck.actionDirective}, Type: ${guardrailCheck.violationType}]: ${guardrailCheck.critique}`,
          {
            ownerId: owner.owner_id,
            actionDirective: guardrailCheck.actionDirective,
            critique: guardrailCheck.critique,
            reason: guardrailCheck.reason,
            original: aiResult.reply,
            corrected: guardrailCheck.correctedReply,
          }
        );
        finalReply = guardrailCheck.correctedReply;
      }
    } catch (gErr: any) {
      chatLogger.warn(`Secondary Guardrail Judge warning: ${gErr.message}`);
    }

    // Layer 3 Pertahanan Akhir: Sanitisasi raw AI reply & Formatter gaya chat (WhatsApp / Telegram)
    finalReply = aiAdapter.sanitizeRawAiReply(finalReply);
    finalReply = aiAdapter.styleChatReply(finalReply, payload.channel);

    // 9 & 10. Pembukuan Transaksi Keuangan
    try {
      await BookkeepingPersister.persistTransactions(owner, payload, persona, aiResult);

      // 11. Simpan Balasan AI & Chat Logs
      await ChatPersister.persistAssistantResponse({
        owner,
        payload,
        isOwner,
        persona,
        finalReply,
        aiResult,
      });

      const totalLatencyMs = Date.now() - startTime;
      chatLogger.info(`Inbound message sukses diproses dalam ${totalLatencyMs}ms`, {
        channel: payload.channel,
        senderId: payload.sender_id,
        persona,
        intent: aiResult.intent,
        totalLatencyMs,
      });

      return {
        status: "success",
        reply_text: finalReply,
      };
    } catch (dbErr: any) {
      chatLogger.error(`Gagal menyimpan data transaksi ke database: ${dbErr.message}`, dbErr, {
        ownerId: owner.owner_id,
        channel: payload.channel,
        externalMessageId: payload.external_message_id,
      });

      await ChatPersister.markInboundFailed(payload, dbErr.message);

      return {
        status: "error",
        reply_text:
          "Mohon maaf, terjadi kendala saat menyimpan pembukuan Anda. Data belum tersimpan. Silakan coba kembali sesaat lagi.",
        error: dbErr.message,
      };
    }
  }
}

export const chatService = new ChatService();
