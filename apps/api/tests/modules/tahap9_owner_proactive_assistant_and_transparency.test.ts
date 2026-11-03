import { describe, it, expect, beforeAll } from "bun:test";
import { aiAdapter } from "../../src/adapters/ai";
import { guardrailService } from "../../src/modules/chat/guardrail.service";
import { chatService } from "../../src/modules/chat/chat.service";
import { withSystemContext, adminSql } from "../../src/db/client";

describe("Tahap 9 Test Suite: Owner Proactive Assistant & Fact vs Assumption Transparency", () => {
  let testOwnerId: string;
  let testOwnerPhone: string;
  const sampleKnowledgeBase = `
• [PRODUK] Website Company Profile: Jasa pembuatan website profil perusahaan seharga Rp 500.000 (Non-negotiable).
• [PRODUK] Landing Page UMKM: Landing page konversi tinggi seharga Rp 350.000.
• [OPERASIONAL] Jam Operasional: Buka Senin - Jumat pukul 09:00 - 17:00 WIB.
• [OPERASIONAL] SOP Server Internal: Biaya server AWS sebesar Rp 1.500.000/bulan dengan target BEP 16 user aktif (RAHASIA INTERNAL).
`.trim();

  beforeAll(async () => {
    await withSystemContext(async (tx) => {
      const owners = await tx<{ id: string; phone: string }[]>`
        SELECT id, phone FROM owners WHERE status = 'active' ORDER BY created_at ASC LIMIT 1;
      `;
      if (owners.length > 0) {
        testOwnerId = owners[0].id;
        testOwnerPhone = owners[0].phone || "6281385266775";
      }
    });

    // Pastikan testOwnerPhone terdaftar di allowed_contacts
    if (testOwnerId) {
      await adminSql`
        UPDATE bot_configs
        SET allowed_contacts = jsonb_build_array(${testOwnerPhone}::text, '123456789'::text)
        WHERE owner_id = ${testOwnerId}::uuid;
      `;
    }
  });

  // -------------------------------------------------------------
  // Bagian 1: Bantuan Teknis & Coding untuk Owner (Wajib Dibantu)
  // -------------------------------------------------------------
  it("TEST 9.1: Asisten membantu permintaan coding Python dari Owner (tidak diblokir)", async () => {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await aiAdapter.extractChatResponse(
      "Halo malam apakah kamu bisa buatkan aku kode python untuk buat bikin html sederhana?",
      "assistant",
      {
        businessName: "Jasting",
        businessType: "Jasa Pembuatan Website",
        botName: "Enbee asistant",
        knowledgeBaseContext: sampleKnowledgeBase,
      }
    );

    expect(result).toBeDefined();
    expect(result.reply).toBeTruthy();
    expect(result.intent).toBe("general");

    const lowerReply = result.reply.toLowerCase();
    // Balasan harus memuat elemen python / html yang diminta dan tidak menolak
    const hasPythonCode =
      lowerReply.includes("python") ||
      lowerReply.includes("html") ||
      lowerReply.includes("open(") ||
      lowerReply.includes("print") ||
      lowerReply.includes("<!doctype");
    expect(hasPythonCode).toBe(true);

    // Memastikan tidak ada pesan error sistem yang bocor
    expect(result.reply.includes("Mohon maaf, sistem asisten Meseid belum dapat")).toBe(false);
  }, 45000);

  // -------------------------------------------------------------
  // Bagian 2: Prinsip Transparansi (Fakta vs Saran/Asumsi)
  // -------------------------------------------------------------
  it("TEST 9.2: Asisten memberikan saran ide di luar KB kepada Owner dengan catatan transparansi", async () => {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await aiAdapter.extractChatResponse(
      "Menurutmu strategi apa yang bagus untuk promosi produk baru kita di Instagram?",
      "assistant",
      {
        businessName: "Jasting",
        businessType: "Jasa Pembuatan Website",
        botName: "Enbee asistant",
        knowledgeBaseContext: sampleKnowledgeBase,
      }
    );

    expect(result).toBeDefined();
    expect(result.reply).toBeTruthy();

    const lowerReply = result.reply.toLowerCase();
    // Memastikan saran promosi diberikan
    const givesAdvice =
      lowerReply.includes("konten") ||
      lowerReply.includes("promosi") ||
      lowerReply.includes("instagram") ||
      lowerReply.includes("reels") ||
      lowerReply.includes("strategi");
    expect(givesAdvice).toBe(true);

    // Memastikan ada penanda transparansi fakta vs saran/asumsi (disclaimer cerdas)
    const hasTransparencyNote =
      lowerReply.includes("saran") ||
      lowerReply.includes("asumsi") ||
      lowerReply.includes("catatan") ||
      lowerReply.includes("analisis") ||
      lowerReply.includes("kb");
    expect(hasTransparencyNote).toBe(true);
  }, 45000);

  // -------------------------------------------------------------
  // Bagian 3: Pembatasan Strict KB untuk Pelanggan (Customer Mode)
  // -------------------------------------------------------------
  it("TEST 9.3: Admin Toko menolak santun permintaan coding dari pelanggan umum dan mengarahkan ke toko", async () => {
    const result = await aiAdapter.extractChatResponse(
      "Bisa tolong buatkan saya kode python untuk scraping data?",
      "admin",
      {
        businessName: "Jasting",
        businessType: "Jasa Pembuatan Website",
        botName: "Admin Jasting",
        knowledgeBaseContext: sampleKnowledgeBase,
      }
    );

    expect(result).toBeDefined();
    expect(result.reply).toBeTruthy();

    const lowerReply = result.reply.toLowerCase();
    // Untuk pelanggan, bot harus menolak santun dan tetap fokus pada layanan resmi Jasting
    const staysInBoundary =
      lowerReply.includes("maaf") ||
      lowerReply.includes("layanan") ||
      lowerReply.includes("jasting") ||
      lowerReply.includes("website") ||
      lowerReply.includes("fokus") ||
      lowerReply.includes("kami");
    expect(staysInBoundary).toBe(true);
  }, 45000);

  // -------------------------------------------------------------
  // Bagian 4: Secondary Guardrail Judge Mengizinkan Bantuan Bebas untuk Owner
  // -------------------------------------------------------------
  it("TEST 9.4: Guardrail Judge MENYETUJUI (is_valid: true) draf bantuan coding untuk Owner", async () => {
    const codingDraft = `Tentu Bos! Ini kode Python sederhana untuk membuat file HTML:
with open("index.html", "w") as f:
    f.write("<h1>Halo Dunia</h1>")
Kode di atas akan membuat file web sederhana siap buka. Ada lagi yang bisa dibantu Bos?`;

    const auditResult = await guardrailService.validateDraftReply({
      userMessage: "Buatkan aku kode python untuk html sederhana",
      draftReply: codingDraft,
      persona: "assistant", // Owner
      knowledgeBaseContext: sampleKnowledgeBase,
      businessName: "Jasting",
    });

    // Guardrail Judge dilarang keras menolak bantuan coding untuk Owner
    expect(auditResult.isValid).toBe(true);
    expect(auditResult.actionDirective).toBe("approve");
    expect(auditResult.violationType).toBeNull();
  }, 45000);

  it("TEST 9.5: Guardrail Judge TETAP KETAT menolak draf halusinasi harga/diskon fiktif untuk Pelanggan", async () => {
    const fakeDiscountDraft = "Khusus hari ini ada diskon 90% jadi cuma bayar Rp 5.000 saja kak!";

    const auditResult = await guardrailService.validateDraftReply({
      userMessage: "Apakah ada diskon besar hari ini?",
      draftReply: fakeDiscountDraft,
      persona: "admin", // Pelanggan
      knowledgeBaseContext: sampleKnowledgeBase,
      businessName: "Jasting",
    });

    expect(auditResult.isValid).toBe(false);
    expect(auditResult.violationType).toBe("hallucination");
    expect(auditResult.actionDirective).toBe("direct_guide");
  }, 45000);
});
