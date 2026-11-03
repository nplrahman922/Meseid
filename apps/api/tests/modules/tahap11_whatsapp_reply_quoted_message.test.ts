import { describe, it, expect } from "bun:test";
import { QuotedMessageExtractor } from "../../../bot/src/whatsapp/formatters/quoted-message.extractor";
import { InboundMessageSchema } from "../../src/modules/chat/chat.schema";
import { Value } from "@sinclair/typebox/value";
import { aiAdapter } from "../../src/adapters/ai";

describe("Tahap 11 Test Suite: WhatsApp Reply / Quoted Message Architecture", () => {
  it("TEST 11.1: QuotedMessageExtractor mengekstrak teks kutipan dari extendedTextMessage Baileys (kasus screenshot)", () => {
    const mockBaileysContent = {
      extendedTextMessage: {
        text: "Oke kalau yg ini loh",
        contextInfo: {
          stanzaId: "MSG-12345",
          participant: "628999888777@s.whatsapp.net",
          quotedMessage: {
            conversation: "Katalog Harga Layanan Jasting:\n• Website Company Profile: Rp 500.000 (non-negotiable)\n• Pembuatan sistem informasi berbasis web: Rp 1,5 juta - 10 juta (nego)\n• Paket Starter Cloud: Rp 99.000/bln",
          },
        },
      },
    };

    const extracted = QuotedMessageExtractor.extractQuotedText(mockBaileysContent);

    expect(extracted).toBeTruthy();
    expect(extracted).toContain("Katalog Harga Layanan Jasting");
    expect(extracted).toContain("Website Company Profile: Rp 500.000");
  });

  it("TEST 11.2: QuotedMessageExtractor mengekstrak teks kutipan dari extendedText dan caption image", () => {
    // Kasus quote dari extendedTextMessage
    const mockExtendedQuote = {
      extendedTextMessage: {
        text: "Berapa totalnya?",
        contextInfo: {
          quotedMessage: {
            extendedTextMessage: {
              text: "Total belanjaan semen 5 sak: Rp 325.000",
            },
          },
        },
      },
    };
    expect(QuotedMessageExtractor.extractQuotedText(mockExtendedQuote)).toBe("Total belanjaan semen 5 sak: Rp 325.000");

    // Kasus quote dari caption foto struk
    const mockImageQuote = {
      extendedTextMessage: {
        text: "Catat nota ini ya Bos",
        contextInfo: {
          quotedMessage: {
            imageMessage: {
              caption: "Struk belanja Alfamart Rp 45.000",
            },
          },
        },
      },
    };
    expect(QuotedMessageExtractor.extractQuotedText(mockImageQuote)).toBe("Struk belanja Alfamart Rp 45.000");
  });

  it("TEST 11.3: InboundMessageSchema memvalidasi payload dengan field quoted_text", () => {
    const validPayload = {
      channel: "whatsapp",
      bot_id: "628123456789",
      external_message_id: "ext-msg-999",
      sender_id: "628999888777",
      sender_name: "Tuan Muda",
      chat_id: "628999888777@s.whatsapp.net",
      chat_type: "private",
      message_type: "text",
      text: "Oke kalau yg ini loh",
      quoted_text: "Katalog Harga Layanan Jasting: Website Company Profile Rp 500.000",
      timestamp: Math.floor(Date.now() / 1000),
    };

    const isValid = Value.Check(InboundMessageSchema, validPayload);
    expect(isValid).toBe(true);
  });

  it("TEST 11.4: Format kontekstual [Membalas pesan] menyatukan teks kutipan dan instruksi user", () => {
    const rawText = "Oke kalau yg ini loh buatkan kode rust";
    const quoted = "Katalog Harga Layanan Jasting: Website Company Profile Rp 500.000";

    const userMessage = `[Membalas pesan]: "${quoted}"\n\n[Pesan Pengguna]: ${rawText}`;

    expect(userMessage).toContain('[Membalas pesan]: "Katalog Harga Layanan Jasting: Website Company Profile Rp 500.000"');
    expect(userMessage).toContain('[Pesan Pengguna]: Oke kalau yg ini loh buatkan kode rust');
  });

  it("TEST 11.5 (Live LLM): Pengguna mereply katalog harga dengan 'Oke kalau yg ini loh' -> AI merespons sesuai konteks kutipan tanpa mengeluh pesan tidak lengkap", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const quotedCatalog = "Katalog Harga Layanan Jasting:\n• Website Company Profile: Rp 500.000\n• Sistem Informasi Berbasis Web: Rp 1,5 - 10 juta\n• Aplikasi Android: Rp 3 - 50 juta";
    const userPrompt = `[Membalas pesan]: "${quotedCatalog}"\n\n[Pesan Pengguna]: Oke kalau yg ini loh coba buatin kode rust nya`;

    const result = await aiAdapter.extractChatResponse(
      userPrompt,
      "assistant",
      {
        businessName: "Jasting",
        businessType: "jasa pembuatan software",
        botName: "Enbee asistant",
        customPersonaPrompt: "Panggil owner dengan 'Tuan Muda'.",
      }
    );

    console.log("[TEST 11.5 AI Reply]:\n", result.reply);

    expect(result.reply).toBeTruthy();
    // AI TIDAK boleh mengatakan pesan tidak lengkap
    expect(result.reply.toLowerCase()).not.toContain("tidak lengkap");
    expect(result.reply.toLowerCase()).not.toContain("kurang lengkap");
    // AI merujuk pada kode Rust dan/atau katalog yang dibalas
    const replyLower = result.reply.toLowerCase();
    const isRelevant = replyLower.includes("rust") || replyLower.includes("company profile") || replyLower.includes("struct");
    expect(isRelevant).toBe(true);
  }, 45000);
});
