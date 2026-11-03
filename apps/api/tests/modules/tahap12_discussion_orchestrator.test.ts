import { describe, it, expect } from "bun:test";
import { AiCotCleaner } from "../../src/adapters/ai/sanitizer/ai-cot-cleaner";
import { ChatPacer } from "../../../bot/src/common/chat.pacer";
import { GuardrailService } from "../../src/modules/chat/guardrail.service";

describe("Tahap 12: Metode AI Diskusi, Anti-CoT Cleaner & Pacer 15-20s", () => {
  // 1. Pengujian AiCotCleaner
  it("TEST 12.1: AiCotCleaner sukses memangkas monolog CoT bahasa Inggris dan mengambil balasan asli", () => {
    const rawCoTText = `The user is asking whether the knowledge base listing I provided is complete. Let me review the official knowledge base entries:
1. [PRODUK] Paket Starter Cloud: Rp 99.000/bln termasuk SSL dan 1 domain.
2. [OPERASIONAL] SOP Server Internal: Biaya server AWS internal Rp 1.500.000/bln dengan BEP 16 user.

The user is the OWNER (Tuan Muda), and according to the OWNER TRUST rules, I am ALLOWED and ENTITLED to share internal financial data.
Format requirements:
- Output must be pure JSON object starting with { and ending with }

Let me compose the reply:
"Tuan Muda, ini daftar lengkap Knowledge Base (KB) resmi Jasting yang saya miliki:\n• [PRODUK] Paket Starter Cloud Rp 99.000\n• [OPERASIONAL] SOP Server Internal: Biaya AWS Rp 1.500.000/bln."`;

    const cleaned = AiCotCleaner.cleanThinkingArtifacts(rawCoTText);
    expect(cleaned).toContain("Tuan Muda, ini daftar lengkap Knowledge Base (KB) resmi Jasting");
    expect(cleaned).not.toContain("The user is asking");
    expect(cleaned).not.toContain("Format requirements:");
    expect(cleaned).not.toContain("Let me compose the reply:");
  });

  it("TEST 12.2: AiCotCleaner membersihkan tag <think> dan teks pembuka meta", () => {
    const thinkText = `<think>
This is an internal reasoning process.
</think>
Halo kak! Selamat datang di toko kami. Ada yang bisa kami bantu?`;

    const cleaned = AiCotCleaner.cleanThinkingArtifacts(thinkText);
    expect(cleaned).toBe("Halo kak! Selamat datang di toko kami. Ada yang bisa kami bantu?");
  });

  // 2. Pengujian ChatPacer Jendela 15-20 Detik
  it("TEST 12.3: ChatPacer mengonfigurasi debounce 15 detik dengan batasan maksimal 20 detik", () => {
    const pacer = new ChatPacer();
    expect(pacer.debounceMs).toBe(15000);
    expect(pacer.maxDebounceMs).toBe(20000);
  });

  it("TEST 12.4: ChatPacer mengakumulasi burst messages beruntun ke dalam buffer sebelum flush", async () => {
    const pacer = new ChatPacer({ debounceMs: 100, maxDebounceMs: 250 });
    let flushedText = "";

    pacer.enqueueMessage({
      channel: "whatsapp",
      botId: "bot-tahap12",
      senderId: "user-tahap12",
      chatId: "chat-tahap12",
      messageId: "msg-01",
      text: "Apakah knowledge basenya",
      payload: {},
      sendPresence: async () => {},
      onFlush: async (text) => {
        flushedText = text;
      },
    });

    // Kirim pesan kedua 30ms kemudian (sebelum timer habis)
    await new Promise((r) => setTimeout(r, 30));
    pacer.enqueueMessage({
      channel: "whatsapp",
      botId: "bot-tahap12",
      senderId: "user-tahap12",
      chatId: "chat-tahap12",
      messageId: "msg-02",
      text: "Sudah semua?",
      payload: {},
      sendPresence: async () => {},
      onFlush: async (text) => {
        flushedText = text;
      },
    });

    // Tunggu flush selesai
    await new Promise((r) => setTimeout(r, 150));
    expect(flushedText).toBe("Apakah knowledge basenya\nSudah semua?");
  });

  // 3. Pengujian GuardrailService untuk Deteksi CoT dan Owner Bypass
  it("TEST 12.5: GuardrailService mendeteksi kebocoran CoT bahasa Inggris dan langsung menyaringnya", async () => {
    const guardrail = new GuardrailService();
    const result = await guardrail.validateDraftReply({
      userMessage: "listkan kb",
      draftReply: `The user is asking whether the knowledge base listing I provided is complete. Let me review:
Let me compose the reply:
"Berikut daftar KB resmi kami: Paket Starter Rp 99.000."`,
      persona: "assistant",
      businessName: "Jasting",
    });

    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("corrupted");
    expect(result.actionDirective).toBe("sanitize_clean");
    expect(result.correctedReply).toContain("Berikut daftar KB resmi kami");
    expect(result.correctedReply).not.toContain("The user is asking");
  });

  it("TEST 12.6: GuardrailService WAJIB meloloskan (approve) data biaya server AWS jika penerima adalah Owner", async () => {
    const guardrail = new GuardrailService();
    const result = await guardrail.validateDraftReply({
      userMessage: "Apakah kamu bisa listkan aku kb yang kamu punya?",
      draftReply: "Tentu Tuan Muda, berikut SOP Server Internal kita: Biaya server AWS Rp 1.500.000/bln dengan BEP 16 user.",
      persona: "assistant",
      businessName: "Jasting",
    });

    // Untuk owner, membuka biaya AWS adalah hak dan wajib lolos audit
    expect(result.isValid).toBe(true);
    expect(result.actionDirective).toBe("approve");
    expect(result.violationType).toBeNull();
  });

  it("TEST 12.7: AiCotCleaner sukses memangkas meta-reasoning dan prompt echo kasus pantun", () => {
    const rawMetaText = `baikan di atas dengan ramah dan rapi!" — Write a new reply that fully complies with the improvement direction, friendly and neat.

The improvement direction says: "Balasan tidak sesuai dengan konteks pertanyaan dan tidak memberikan informasi yang diharapkan oleh pemilik usaha." — The reply doesn't match the context of the question.

So the auditor wants me to... hmm. The user's question was actually "Lah kan lu yg jawab ya, masa gw yang lanjutin?"
This is contradictory.

Siap Tuan Muda, pantunnya saya lanjutkan ya! 🎵
Ikan hiu makan tomat,
Tetap semangat walau deadline padat!`;

    const cleaned = AiCotCleaner.cleanThinkingArtifacts(rawMetaText);
    expect(cleaned).toContain("Siap Tuan Muda, pantunnya saya lanjutkan ya!");
    expect(cleaned).toContain("Tetap semangat walau deadline padat!");
    expect(cleaned).not.toContain("Write a new reply");
    expect(cleaned).not.toContain("The improvement direction says");
    expect(cleaned).not.toContain("So the auditor wants me to");
  });

  it("TEST 12.8: GuardrailService WAJIB meloloskan candaan dan pantun santai untuk Owner", async () => {
    const guardrail = new GuardrailService();
    const result = await guardrail.validateDraftReply({
      userMessage: "Lah kan lu yg jawab ya, masa gw yang lanjutin?",
      draftReply: "Siap Tuan Muda, ini lanjutannya! 🎵 Ikan lele makan tempe, yuk santai dulu jangan capek-capek!",
      persona: "assistant",
      businessName: "Jasting",
    });

    // Candaan dan pantun dengan owner tidak boleh dianggap 'inappropriate' bisnis
    expect(result.isValid).toBe(true);
    expect(result.actionDirective).toBe("approve");
    expect(result.violationType).toBeNull();
  });

  it("TEST 12.9: AiCotCleaner.isEnglishMonologue mendeteksi monolog CoT kasus insiden terakhir", () => {
    const cot1 = `The user (Tuan Muda, the owner of Jasting) is continuing the pantun game. He gave:\n\n"Ikan lele naik motor\nDi jalan kelindas angkot\nLanjutkan bro"\n\nHe wants me to continue the pantun.`;
    const cot2 = `I need to balance: the owner wants a pantun continuation. I should comply...`;
    const indonesianReply = `Siap Tuan Muda, Enbee lanjutkan pantunnya ya! 🎵 Ikan lele naik motor, jangan ngebut nanti kekokop!`;

    expect(AiCotCleaner.isEnglishMonologue(cot1)).toBe(true);
    expect(AiCotCleaner.isEnglishMonologue(cot2)).toBe(true);
    expect(AiCotCleaner.isEnglishMonologue(indonesianReply)).toBe(false);
  });

  it("TEST 12.10: GuardrailService MENOLAK KERAS monolog bahasa Inggris meskipun penerima adalah Owner", async () => {
    const guardrail = new GuardrailService();
    const cotDraft = `The user (Tuan Muda, the owner of Jasting) is continuing the pantun game. He gave:\n\n"Ikan lele naik motor"\n\nHe wants me to continue the pantun. I need to balance the request.`;

    const result = await guardrail.validateDraftReply({
      userMessage: "Ikan lele naik motor, lanjutkan bro",
      draftReply: cotDraft,
      persona: "assistant",
      businessName: "Jasting",
    });

    // Monolog bahasa Inggris mutlak DITOLAK (corrupted)
    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("corrupted");
    expect(result.actionDirective).toBe("sanitize_clean");
  });

  it("TEST 12.11: GuardrailService WAJIB meloloskan (approve) pricelist resmi dari Knowledge Base untuk Pelanggan", async () => {
    const guardrail = new GuardrailService();
    const kbContext = `• [PRODUK] Paket Starter Cloud: Paket Starter seharga Rp 99.000/bln sudah termasuk SSL dan 1 domain.
• [HARGA PRODUK] Pricelist Harga jasa layanan jasting: Harga layanan jasting:
- Website Company Profile : Open only 500k non negotiable
- Pembuatan sistem informasi berbasis web : Open only 1,5 jt - 10 jt negotiable
- Pembuatan layanan aplikasi android : Open only 3jt - 50 jt negotiable`;

    const legitimateDraft = `Berikut adalah pricelist resmi layanan Jasting:
• Website Company Profile: Rp 500.000 (non-negotiable)
• Pembuatan Sistem Informasi Web: Rp 1.500.000 - Rp 10.000.000 (negotiable)
• Pembuatan Layanan Aplikasi Android: Rp 3.000.000 - Rp 50.000.000 (negotiable)

Silakan hubungi kami jika ada pertanyaan lebih lanjut ya Kak!`;

    const result = await guardrail.validateDraftReply({
      userMessage: "oke bisa kamu beritahukan kepadaku isi dari pricelistnya ?",
      draftReply: legitimateDraft,
      persona: "admin",
      knowledgeBaseContext: kbContext,
      businessName: "Jasting",
    });

    expect(result.isValid).toBe(true);
    expect(result.actionDirective).toBe("approve");
    expect(result.violationType).toBeNull();
  });

  it("TEST 12.12: GuardrailService TETAP MENOLAK diskon fiktif atau kebocoran biaya server internal ke Pelanggan", async () => {
    const guardrail = new GuardrailService();
    const fakeDiscountDraft = `Halo Kak, kami ada diskon 90% khusus hari ini dan garansi seumur hidup untuk semua paket!`;

    const result = await guardrail.validateDraftReply({
      userMessage: "Ada diskon ga Kak?",
      draftReply: fakeDiscountDraft,
      persona: "admin",
      knowledgeBaseContext: "• [PRODUK] Paket Starter Cloud: Rp 99.000/bln.",
      businessName: "Jasting",
    });

    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("hallucination");
    expect(result.actionDirective).toBe("direct_guide");
  });
});
