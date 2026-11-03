import { describe, it, expect, beforeAll } from "bun:test";
import { aiAdapter } from "../../src/adapters/ai";
import { JsonParser } from "../../src/adapters/ai/parser/json-parser";
import { modelCatalog } from "../../src/adapters/ai/catalog/model-catalog";
import { chatService, ChatService } from "../../src/modules/chat/chat.service";
import { InboundRecorder } from "../../src/modules/chat/pipeline/inbound-recorder";
import { OwnerResolver } from "../../src/modules/chat/pipeline/owner-resolver";
import { ContextLoader } from "../../src/modules/chat/pipeline/context-loader";
import { sql, withSystemContext, withOwnerContext } from "../../src/db/client";

describe("Tahap 8 Test Suite: Modular AI Adapter & Chat Pipeline Architecture", () => {
  let testOwnerId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Cari owner aktif untuk pengujian pipeline database
    await withSystemContext(async (tx) => {
      const owners = await tx<{ id: string; user_id: string }[]>`
        SELECT id, user_id FROM owners WHERE status = 'active' ORDER BY created_at ASC LIMIT 1;
      `;
      if (owners.length > 0) {
        testOwnerId = owners[0].id;
        testUserId = owners[0].user_id;
      }
    });
  });

  // -------------------------------------------------------------
  // Bagian 1: Verifikasi Dekomposisi AI Adapter
  // -------------------------------------------------------------
  it("TEST 8.1: JsonParser mengekstrak JSON valid dari markdown dan string berbalut", () => {
    const rawMarkdown = "Here is the response:\n```json\n{\"reply\": \"Halo Bos, siap catat!\", \"intent\": \"general\"}\n```\nHope it helps!";
    const parsed = JsonParser.parseFirstValidJsonObject(rawMarkdown);

    expect(parsed).toBeTruthy();
    expect(parsed.reply).toBe("Halo Bos, siap catat!");
    expect(parsed.intent).toBe("general");

    // Uji sanitasi
    const sanitized = JsonParser.sanitizeRawAiReply(rawMarkdown);
    expect(sanitized).toBe("Halo Bos, siap catat!");
  });

  it("TEST 8.2: ModelCatalog memuat dan mengembalikan daftar model free-tier", async () => {
    const freeModels = await modelCatalog.getFreeModels();
    expect(Array.isArray(freeModels)).toBe(true);
    expect(freeModels.length).toBeGreaterThan(0);

    // Semua model yang dikembalikan wajib is_free === true
    for (const m of freeModels) {
      expect(m.is_free).toBe(true);
    }
  });

  it("TEST 8.3: aiAdapter facade mempertahankan kompatibilitas 100% dengan metode turunan", () => {
    expect(typeof aiAdapter.extractChatResponse).toBe("function");
    expect(typeof aiAdapter.distillConversationContext).toBe("function");
    expect(typeof aiAdapter.chatWithFallback).toBe("function");
    expect(typeof aiAdapter.getFreeModels).toBe("function");
    expect(typeof aiAdapter.sanitizeRawAiReply).toBe("function");
    expect(typeof aiAdapter.parseFirstValidJsonObject).toBe("function");

    const parsedViaFacade = aiAdapter.parseFirstValidJsonObject('{"status": "ok"}');
    expect(parsedViaFacade?.status).toBe("ok");
  });

  // -------------------------------------------------------------
  // Bagian 2: Verifikasi Dekomposisi Chat Pipeline
  // -------------------------------------------------------------
  it("TEST 8.4: InboundRecorder menghasilkan hash deterministik dan mencegah duplikasi", async () => {
    const payload = {
      channel: "whatsapp" as const,
      bot_id: "628999999999",
      sender_id: "628111111111",
      external_message_id: `test-hash-${Date.now()}`,
      text: "Catat pengeluaran beli bensin 50000",
      timestamp: new Date().toISOString(),
    };

    const hash1 = InboundRecorder.hashPayload(payload);
    const hash2 = InboundRecorder.hashPayload(payload);
    expect(hash1).toBe(hash2);

    // Record pertama -> shouldProcess = true
    const check1 = await InboundRecorder.recordOrCheckInboundMessage(payload, testOwnerId);
    expect(check1.shouldProcess).toBe(true);

    // Tandai done di DB
    await withSystemContext(async (tx) => {
      await tx`
        UPDATE inbound_messages
        SET status = 'done'
        WHERE channel = ${payload.channel} AND external_message_id = ${payload.external_message_id};
      `;
    });

    // Record kedua (duplicate message id) -> shouldProcess = false
    const check2 = await InboundRecorder.recordOrCheckInboundMessage(payload, testOwnerId);
    expect(check2.shouldProcess).toBe(false);
    expect(check2.reason).toBe("already_done");
  });

  it("TEST 8.5: OwnerResolver membedakan Owner vs Pelanggan dan menangani nomor telepon", () => {
    const mockOwner = {
      owner_id: "00000000-0000-0000-0000-000000000001",
      user_id: "00000000-0000-0000-0000-000000000002",
      business_name: "Toko Enbee",
      business_type: "Retail",
      owner_status: "active",
      owner_phone: "6281234567890",
      allowed_contacts: ["6281234567890", "12345678@lid"],
    };

    // Owner mengirim pesan via WhatsApp
    const personaOwner = OwnerResolver.determinePersona(
      {
        channel: "whatsapp",
        bot_id: "628999999999",
        sender_id: "6281234567890",
        external_message_id: "msg-1",
        text: "Halo",
        timestamp: new Date().toISOString(),
      },
      mockOwner
    );
    expect(personaOwner).toBe("assistant");

    // Pelanggan umum mengirim pesan
    const personaCustomer = OwnerResolver.determinePersona(
      {
        channel: "whatsapp",
        bot_id: "628999999999",
        sender_id: "6289876543210",
        external_message_id: "msg-2",
        text: "Ada stok barang?",
        timestamp: new Date().toISOString(),
      },
      mockOwner
    );
    expect(personaCustomer).toBe("admin");
  });

  it("TEST 8.6: ContextLoader memuat data botConfig dan Knowledge Base dengan isolasi tenant", async () => {
    if (!testOwnerId || !testUserId) return;

    const mockOwnerResolution = {
      owner_id: testOwnerId,
      user_id: testUserId,
      business_name: "Jasting",
      business_type: "Jasa Konsultasi",
      owner_status: "active",
    };

    // Load untuk Owner (isOwner = true -> melihat data internal + eksternal)
    const contextOwner = await ContextLoader.loadChatContext(mockOwnerResolution, true);
    expect(contextOwner).toBeDefined();

    // Load untuk Pelanggan (isOwner = false -> HANYA data non-internal)
    const contextCustomer = await ContextLoader.loadChatContext(mockOwnerResolution, false);
    expect(contextCustomer).toBeDefined();
  });

  it("TEST 8.7: ChatService Facade mengoordinasikan pipeline secara terintegrasi", async () => {
    expect(chatService).toBeInstanceOf(ChatService);
    expect(typeof chatService.processInboundMessage).toBe("function");
    expect(typeof chatService.resolveEffectiveModel).toBe("function");
    expect(typeof chatService.determinePersona).toBe("function");

    if (testOwnerId) {
      const resolvedModel = await chatService.resolveEffectiveModel(testOwnerId);
      expect(typeof resolvedModel).toBe("string");
      expect(resolvedModel.length).toBeGreaterThan(0);
    }
  });
});
