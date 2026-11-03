import { describe, it, expect, beforeAll } from "bun:test";
import { ChatService } from "../../src/modules/chat/chat.service";
import { withSystemContext } from "../../src/db/client";

describe("Verifikasi Pengenalan Nomor Owner vs Pelanggan di WhatsApp", () => {
  const chatService = new ChatService();

  const mockBotPhone = "62899990001";
  const mockOwnerPhone = "+6281385266775";
  const mockCustomerPhone1 = "6287812345678";
  const mockCustomerPhone2 = "085298765432";

  const mockOwnerResolution = {
    owner_id: "50380ca6-9c51-45b5-8f3b-4f39e99fea0b",
    user_id: "user-123",
    business_name: "Jasting",
    business_type: "jasa",
    owner_status: "active",
    owner_phone: mockOwnerPhone,
  };

  it("1. Nomor pengirim sama persis dengan nomor HP Owner di database -> Dikenali sebagai Owner (assistant)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "whatsapp",
        bot_id: mockBotPhone,
        external_message_id: "msg_001",
        sender_id: "6281385266775",
        sender_name: "Owner Jasting",
        chat_id: "6281385266775@s.whatsapp.net",
        chat_type: "private",
        message_type: "text",
        text: "Catat beli bensin 25rb",
        timestamp: Date.now(),
      },
      mockOwnerResolution
    );

    expect(persona).toBe("assistant");
  });

  it("2. Format nomor pengirim diawali '08...' otomatis dinormalisasi ke '628...' -> Dikenali sebagai Owner (assistant)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "whatsapp",
        bot_id: mockBotPhone,
        external_message_id: "msg_002",
        sender_id: "081385266775",
        sender_name: "Owner Jasting",
        chat_id: "081385266775@s.whatsapp.net",
        chat_type: "private",
        message_type: "text",
        text: "Catat pengeluaran 50rb",
        timestamp: Date.now(),
      },
      mockOwnerResolution
    );

    expect(persona).toBe("assistant");
  });

  it("3. Owner mengirim chat ke nomor dirinya sendiri (Self-Chat / sender_id === bot_id) -> Dikenali sebagai Owner (assistant)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "whatsapp",
        bot_id: mockBotPhone,
        external_message_id: "msg_003",
        sender_id: mockBotPhone,
        sender_name: "Self",
        chat_id: `${mockBotPhone}@s.whatsapp.net`,
        chat_type: "private",
        message_type: "text",
        text: "Beli pulsa 50rb",
        timestamp: Date.now(),
      },
      mockOwnerResolution
    );

    expect(persona).toBe("assistant");
  });

  it("4. Pesan dengan flag is_from_me = true -> Dikenali sebagai Owner (assistant)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "whatsapp",
        bot_id: mockBotPhone,
        external_message_id: "msg_004",
        sender_id: "any_sender",
        sender_name: "Me",
        chat_id: "any_chat",
        chat_type: "private",
        message_type: "text",
        text: "Catat transaksi",
        is_from_me: true,
        timestamp: Date.now(),
      },
      mockOwnerResolution
    );

    expect(persona).toBe("assistant");
  });

  it("5. Nomor pelanggan asing (format 628...) -> Dikenali sebagai Pelanggan (admin)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "whatsapp",
        bot_id: mockBotPhone,
        external_message_id: "msg_005",
        sender_id: mockCustomerPhone1,
        sender_name: "Customer Budi",
        chat_id: `${mockCustomerPhone1}@s.whatsapp.net`,
        chat_type: "private",
        message_type: "text",
        text: "Halo kak, harga paket website berapa ya?",
        timestamp: Date.now(),
      },
      mockOwnerResolution
    );

    expect(persona).toBe("admin");
  });

  it("6. Nomor pelanggan asing (format 08...) -> Dikenali sebagai Pelanggan (admin)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "whatsapp",
        bot_id: mockBotPhone,
        external_message_id: "msg_006",
        sender_id: mockCustomerPhone2,
        sender_name: "Customer Siti",
        chat_id: `${mockCustomerPhone2}@s.whatsapp.net`,
        chat_type: "private",
        message_type: "text",
        text: "Toko buka jam berapa?",
        timestamp: Date.now(),
      },
      mockOwnerResolution
    );

    expect(persona).toBe("admin");
  });

  it("7. WhatsApp LID milik Owner yang terdaftar di database (allowed_contacts) -> Dikenali sebagai Owner (assistant)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "whatsapp",
        bot_id: mockBotPhone,
        external_message_id: "msg_007",
        sender_id: "45273518715014",
        sender_name: "Owner via WhatsApp LID",
        chat_id: "45273518715014@lid",
        chat_type: "private",
        message_type: "text",
        text: "Apakah kamu mengenaliku sebagai owner toko?",
        timestamp: Date.now(),
      },
      {
        ...mockOwnerResolution,
        allowed_contacts: ["45273518715014"],
      }
    );

    expect(persona).toBe("assistant");
  });

  it("8. Telegram Chat ID milik Owner yang terdaftar di database (allowed_contacts) -> Dikenali sebagai Owner (assistant)", () => {
    const persona = chatService.determinePersona(
      {
        channel: "telegram",
        bot_id: "8655389335",
        external_message_id: "tg_008",
        sender_id: "123456789",
        sender_name: "Owner via Telegram",
        chat_id: "123456789",
        chat_type: "private",
        message_type: "text",
        text: "Catat pengeluaran 100rb",
        timestamp: Date.now(),
      },
      {
        ...mockOwnerResolution,
        allowed_contacts: ["123456789"],
      }
    );

    expect(persona).toBe("assistant");
  });
});
