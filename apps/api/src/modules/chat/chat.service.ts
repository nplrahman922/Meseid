import { aiAdapter } from "../../adapters/ai";
import { guardrailService } from "./guardrail.service";
import { createModuleLogger } from "../../logs";
import type { InboundMessageInput, ProcessInboundResponse } from "./chat.schema";
import { InboundRecorder } from "./pipeline/inbound-recorder";
import { OwnerResolver, type ChannelOwnerResolution } from "./pipeline/owner-resolver";
import { ContextLoader } from "./pipeline/context-loader";
import { MemoryWindowReader } from "./pipeline/memory-window.reader";
import { DiscussionOrchestrator } from "./pipeline/discussion-orchestrator";
import { BookkeepingPersister } from "./pipeline/bookkeeping-persister";
import { ChatPersister } from "./pipeline/chat-persister";
import { PresetResolver } from "./pipeline/preset-resolver";
import { AudioTranscriber } from "../../adapters/ai/audio/audio-transcriber";
import { AccessGate } from "./pipeline/access-gate";
import { OperatingHoursEvaluator } from "./pipeline/operating-hours.evaluator";
import { ScheduleOrchestrator } from "./pipeline/schedule-orchestrator";

const chatLogger = createModuleLogger("chat-service");

export class ChatService {
  /**
   * Menentukan persona ('assistant' untuk Owner, 'admin' untuk Pelanggan).
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
   * Resolusi model efektif berdasarkan preset database ai_model_presets.
   */
  async resolveEffectiveModel(
    ownerId: string,
    persona: "assistant" | "admin" = "admin"
  ): Promise<string> {
    const preset = await PresetResolver.resolveRuntimePreset(ownerId, persona);
    return preset.model_id;
  }

  /**
   * Main Pipeline Coordinator untuk pemrosesan pesan inbound chat.
   */
  async processInboundMessage(payload: InboundMessageInput): Promise<ProcessInboundResponse> {
    const startTime = Date.now();
    let rawUserMessage = payload.text?.trim() || "";
    const quotedText = payload.quoted_text?.trim();

    // 1. Multi-tenant Owner Resolution
    const owner = await OwnerResolver.resolveOrBindOwner(payload);
    if (!owner) {
      return {
        status: "ignored",
        reply_text: "",
        reason: "unregistered_channel",
      };
    }

    // 2. Idempotency & Inbound Record
    const check = await InboundRecorder.recordOrCheckInboundMessage(payload, owner.owner_id);
    if (!check.shouldProcess) {
      return {
        status: "ignored",
        reply_text: "",
        reason: check.reason,
      };
    }

    // 2b. Access Gate Evaluation (Blacklist, Whitelist, Group Trigger & Auto-Discovery)
    const access = await AccessGate.evaluate(payload, owner.owner_id);
    if (!access.allowed) {
      return {
        status: "ignored",
        reply_text: "",
        reason: access.reason,
      };
    }

    // 3. Persona Detection (Unifikasi Peran Kontak Nomor & Grup dari Access Gate)
    const persona =
      access.effectivePersona || access.groupPersona || this.determinePersona(payload, owner);
    const isOwner = persona === "assistant";

    // 3.1 Evaluasi Jam Operasional & Penjadwalan Toko (Out-of-Hours Auto-Reply)
    const hoursEval = await OperatingHoursEvaluator.evaluate(
      owner.owner_id,
      isOwner,
      persona
    );

    if (hoursEval.shouldIntercept && hoursEval.replyMessage) {
      await ChatPersister.persistInboundSuccess(payload, owner, hoursEval.replyMessage);
      return {
        status: "success",
        reply_text: hoursEval.replyMessage,
      };
    }

    // 4. Resolusi Preset & Parameter Model AI dari Database
    const preset = await PresetResolver.resolveRuntimePreset(owner.owner_id, persona);
    const effectiveModel = preset.model_id;

    // 5. Penanganan Media Khusus: Audio (Voice Note)
    const audioAtt = payload.attachments?.find(
      (a) => a.file_type === "audio" || a.mime_type?.startsWith("audio/")
    );
    if (audioAtt && audioAtt.data_base64) {
      if (!preset.supports_audio) {
        return {
          status: "success",
          reply_text: isOwner
            ? `Mohon maaf Bos, model bot yang saat ini aktif (${preset.display_name}) belum mendukung pemrosesan pesan suara / Voice Note. Silakan aktifkan model Pro (seperti Gemini 2.5 Flash atau GPT-4o) pada menu Pengaturan Persona Bot.`
            : `Halo kak! Terima kasih atas pesan suaranya. Pesan suara kakak telah kami teruskan ke admin toko kami untuk didengarkan langsung ya kak. 🙏`,
        };
      }

      // Transkripsikan rekaman audio menjadi teks
      const transcript = await AudioTranscriber.transcribeAudio({
        audioBase64: audioAtt.data_base64,
        mimeType: audioAtt.mime_type,
      });

      if (transcript) {
        rawUserMessage = rawUserMessage
          ? `${rawUserMessage}\n${transcript}`
          : transcript;
      } else {
        chatLogger.warn("Transkripsi audio menghasilkan teks kosong", {
          channel: payload.channel,
          senderId: payload.sender_id,
        });

        return {
          status: "success",
          reply_text: isOwner
            ? "Mohon maaf, pesan suara belum terdengar jelas atau gagal diproses oleh sistem. Silakan kirimkan ulang pesan suara Anda atau ketik dalam bentuk pesan teks ya."
            : "Halo kak! Mohon maaf pesan suaranya belum terdengar jelas di sistem kami. Boleh dibantu ketik pesannya langsung ya kak? Terima kasih! 🙏",
        };
      }
    }

    // 6. Penanganan Media Khusus: Foto / OCR Nota Belanja
    const photoAtt = payload.attachments?.find(
      (a) => a.file_type === "photo" || a.mime_type?.startsWith("image/")
    );
    if (photoAtt) {
      // Isolasi Keamanan: Pelanggan umum dilarang memicu pembukuan kas lewat foto
      if (!isOwner) {
        return {
          status: "success",
          reply_text: `Halo kak! Terima kasih sudah mengirimkan gambar. Foto yang kakak kirimkan telah kami teruskan ke admin toko kami untuk dicek dan diverifikasi secara langsung. Tim kami akan segera merespons ya kak! 😊`,
        };
      }

      // Untuk Asisten Usaha: Pastikan model aktif mendukung Vision
      if (!preset.supports_vision) {
        return {
          status: "success",
          reply_text: `Mohon maaf Bos, model bot yang saat ini aktif (${preset.display_name}) adalah model teks standar tanpa fitur OCR pembaca foto. Silakan aktifkan model Pro (seperti Gemini 2.5 Flash atau GPT-4o) di menu Persona Bot untuk membaca nota secara otomatis.`,
        };
      }

      if (!rawUserMessage) {
        rawUserMessage = "Tolong periksa dan catat transaksi dari foto nota ini.";
      }
    }

    const userMessage = quotedText
      ? `[Membalas pesan]: "${quotedText}"\n\n[Pesan Pengguna]: ${rawUserMessage}`
      : rawUserMessage;

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

    // 6.1 Jalur Penjadwalan: Konfirmasi & Manajemen Agenda / Booking (Google Calendar)
    if (isOwner) {
      // Prioritas 1: Periksa apakah pesan adalah jawaban konfirmasi atas draf jadwal (Ya/Batal)
      const confirmResult = await ScheduleOrchestrator.handleOwnerConfirmation(owner, userMessage);
      if (confirmResult.handled && confirmResult.replyText) {
        await ChatPersister.persistInboundSuccess(payload, owner, confirmResult.replyText);
        return {
          status: "success",
          reply_text: confirmResult.replyText,
        };
      }

      // Prioritas 2: Periksa apakah pesan meminta membuat / menghapus agenda jadwal
      const ownerSchedResult = await ScheduleOrchestrator.handleOwnerIntent(owner, userMessage);
      if (ownerSchedResult.handled && ownerSchedResult.replyText) {
        await ChatPersister.persistInboundSuccess(payload, owner, ownerSchedResult.replyText);
        return {
          status: "success",
          reply_text: ownerSchedResult.replyText,
        };
      }
    } else {
      // Untuk Pelanggan (Admin Persona): Deteksi permintaan booking / reservasi
      const bookingResult = await ScheduleOrchestrator.handleCustomerBooking(owner, payload, userMessage);
      if (bookingResult.handled && bookingResult.replyText) {
        await ChatPersister.persistInboundSuccess(payload, owner, bookingResult.replyText);
        return {
          status: "success",
          reply_text: bookingResult.replyText,
        };
      }
    }

    // 7. Muat Konteks Knowledge Base & Persona
    const chatContext = await ContextLoader.loadChatContext(owner, isOwner);

    // 8. Memory Window & Simpan Pesan User
    const memory = await MemoryWindowReader.processUserMemory(
      payload,
      owner.owner_id,
      isOwner,
      persona,
      userMessage
    );

    // 9. Metode AI Diskusi 4 Tahapan (Generator + Critic Loop & Auto-Refinement)
    let aiResult;
    let finalReply = "";
    try {
      const discussion = await DiscussionOrchestrator.executeDiscussionLoop({
        userMessage,
        persona,
        owner,
        chatContext,
        memory,
        effectiveModel,
        preset,
        channel: payload.channel,
        attachments: payload.attachments,
      });

      aiResult = discussion.aiResult;
      finalReply = discussion.reply;
    } catch (aiErr: any) {
      chatLogger.error(`Gagal memanggil AI Pipeline: ${aiErr.message}`, aiErr, {
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

    // Layer Pertahanan Akhir: Sanitisasi raw AI reply & Formatter gaya chat (WhatsApp / Telegram)
    finalReply = aiAdapter.sanitizeRawAiReply(finalReply);
    finalReply = aiAdapter.styleChatReply(finalReply, payload.channel);

    // 10. Pembukuan Transaksi Keuangan (Hanya untuk Asisten Internal)
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
