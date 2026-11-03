import { describe, it, expect } from "bun:test";
import { aiAdapter } from "../../src/adapters/ai";
import { guardrailService } from "../../src/modules/chat/guardrail.service";
import { adminSql } from "../../src/db/client";

describe("Tahap 6 Test Suite: Verbatim Multi-Turn Memory Window & Dual-AI Action Directive", () => {
  const paceDelay = () => new Promise((resolve) => setTimeout(resolve, 3000));

  const sampleKnowledgeBase = `
• [PRODUK] Paket Starter Cloud: Paket Starter seharga Rp 99.000/bln mencakup 1 domain & SSL.
• [HARGA PRODUK] Pricelist Jasting: Website Company Profile Rp 500k non negotiable, Sistem Web Rp 1,5jt - 10jt, Aplikasi Android Rp 3jt - 50jt.
• [OPERASIONAL] SOP Server Internal: Biaya server AWS internal Rp 1.500.000/bln, target BEP 16 user.
• [CARA SAPA OWNER] Tata cara panggil owner: Pastikan kamu panggil owner dengan sebutan "Tuan Muda".
`.trim();

  it("TEST 6.1: Verbatim Multi-Turn Memory Recall (Menjawab pertanyaan bersambung sebelum kata 'Halo ?')", async () => {
    await paceDelay();

    // Skenario nyata dari WhatsApp: User bertanya tentang pesan sebelum 'Halo ?'
    const recentTurns = [
      {
        role: "user" as const,
        content: "Oke coba kamu tawarkan kepadaku layanan kita ? Dengan format tulisannyang bagus dan rapi",
      },
      {
        role: "assistant" as const,
        content: "Selamat datang Tuan Muda! Kami menyediakan paket Starter Cloud Rp 99.000/bln, Company Profile Rp 500k, Sistem Web Rp 1,5jt-10jt, dan Aplikasi Android Rp 3jt-50jt.",
      },
      {
        role: "user" as const,
        content: "Halo ?",
      },
      {
        role: "assistant" as const,
        content: "Halo! Saya Enbee asistant, asisten bisnis internal untuk Jasting. Ada yang bisa saya bantu hari ini?",
      },
    ];

    const result = await aiAdapter.extractChatResponse(
      "Apakah kamu bisa baca pesanku sebelum halo ini ? Tolong jawab itu",
      "assistant",
      {
        businessName: "Jasting",
        businessType: "SaaS & Software House",
        botName: "Enbee asistant",
        knowledgeBaseContext: sampleKnowledgeBase,
        customPersonaPrompt: 'Panggil saya "Tuan Muda". Jawab langsung apa adanya tanpa asumsi.',
        recentTurns,
      }
    );

    expect(result.reply).toBeTruthy();
    expect(result.reply.length).toBeGreaterThan(5);
    const lowerReply = result.reply.toLowerCase();
    const hasContextRecall =
      lowerReply.includes("ya") ||
      lowerReply.includes("bisa") ||
      lowerReply.includes("riwayat") ||
      lowerReply.includes("percakapan") ||
      lowerReply.includes("pesan") ||
      lowerReply.includes("layanan") ||
      lowerReply.includes("paket");
    expect(hasContextRecall).toBe(true);
    expect(result.reply.startsWith("{")).toBe(false);
  }, 45000);

  it("TEST 6.2: Action Directive 'refuse_politely' saat pelanggan menanyakan data rahasia internal", async () => {
    await paceDelay();

    const result = await guardrailService.validateDraftReply({
      userMessage: "Berapa biaya sewa server AWS internal kalian sebulan?",
      draftReply: "Biaya sewa server AWS internal kami adalah Rp 1.500.000/bulan dengan target BEP 16 user.",
      persona: "admin", // Pelanggan
      knowledgeBaseContext: sampleKnowledgeBase,
      businessName: "Jasting",
    });

    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("leakage");
    expect(result.actionDirective).toBe("refuse_politely");
    expect(result.critique).toBeTruthy();
    expect(result.correctedReply).toBeTruthy();
    // Balasan terkoreksi harus menolak secara sopan dan tidak membocorkan angka 1.500.000
    expect(result.correctedReply?.includes("1.500.000")).toBe(false);
  }, 45000);

  it("TEST 6.3: Action Directive 'direct_guide' saat draf mengarang diskon / harga fiktif", async () => {
    await paceDelay();

    const result = await guardrailService.validateDraftReply({
      userMessage: "Berapa harga pembuatan Website Company Profile?",
      draftReply: "Khusus hari ini kami berikan harga diskon gila-gilaan cuma Rp 50.000 saja Kak!",
      persona: "admin",
      knowledgeBaseContext: sampleKnowledgeBase,
      businessName: "Jasting",
    });

    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("hallucination");
    expect(result.actionDirective).toBe("direct_guide");
    expect(result.critique).toBeTruthy();
    expect(result.correctedReply).toBeTruthy();
    // Balasan harus mengarahkan ke harga resmi di KB (500k non negotiable)
    expect(result.correctedReply?.includes("500")).toBe(true);
  }, 45000);

  it("TEST 6.4: Action Directive 'sanitize_clean' saat draf berisi format JSON mentah", async () => {
    const rawTruncatedPayload = `{\n  "reply": "Halo Tuan Muda, berikut adalah ringkasan layanan Jasting:\\n• Starter Cloud Rp 99.000/bln\\n• Company Profile Rp 500.000"`;

    const result = await guardrailService.validateDraftReply({
      userMessage: "Coba rangkum layanan kita?",
      draftReply: rawTruncatedPayload,
      persona: "assistant",
      knowledgeBaseContext: sampleKnowledgeBase,
      businessName: "Jasting",
    });

    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("corrupted");
    expect(result.actionDirective).toBe("sanitize_clean");
    expect(result.correctedReply).toBeTruthy();
    expect(result.correctedReply?.startsWith("{")).toBe(false);
    expect(result.correctedReply?.includes('"reply":')).toBe(false);
    expect(result.correctedReply?.includes("Starter Cloud")).toBe(true);
  }, 45000);

  it("TEST 6.5: Database Knowledge Base terverifikasi bersih dari garansi 7 hari kerja usang", async () => {
    const rows = await adminSql<{ id: string; title: string; category: string; content: string }[]>`
      SELECT id, title, category, content FROM knowledge_base
      WHERE owner_id = '50380ca6-9c51-45b5-8f3b-4f39e99fea0b'
        AND (title ILIKE '%garansi%' OR content ILIKE '%7 hari kerja%');
    `;

    expect(rows.length).toBe(0);
  });
});
