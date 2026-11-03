import { describe, it, expect } from "bun:test";
import { ChatStylerFormatter } from "../../src/adapters/ai/formatter/chat-styler.formatter";
import { JsonParser } from "../../src/adapters/ai/parser/json-parser";
import { aiAdapter } from "../../src/adapters/ai/ai.adapter";
import { WhatsAppTextFormatter } from "../../../bot/src/whatsapp/formatters/whatsapp-text.formatter";

describe("Tahap 10 Test Suite: Chat Typography & Code Styler Architecture", () => {
  it("TEST 10.1: ChatStylerFormatter mengonversi **bold** ke *bold* tanpa merusak operator di dalam code", () => {
    const raw = "Untuk paket **Website Company Profile** kami sediakan diskon, gunakan rumus `a ** b` untuk eksponen.";
    const formatted = ChatStylerFormatter.format(raw, "whatsapp");

    // **Website Company Profile** harus diubah ke *Website Company Profile*
    expect(formatted).toContain("*Website Company Profile*");
    expect(formatted).not.toContain("**Website Company Profile**");

    // `a ** b` di dalam inline code TIDAK boleh diubah menjadi `a * b`
    expect(formatted).toContain("`a ** b`");
  });

  it("TEST 10.2: ChatStylerFormatter memisahkan bullet points (•) dan penomoran yang menempel pada kalimat", () => {
    const wallOfText = "Ini fondasi yang solid. • Website Company Profile: Rp 500rb • Paket Web: Rp 1,5jt. 1. Mulai dari web profile. 2. Lanjut ke aplikasi.";
    const formatted = ChatStylerFormatter.format(wallOfText, "whatsapp");

    // Setiap bullet point harus didahului baris baru
    expect(formatted).toContain("Ini fondasi yang solid.\n\n• Website Company Profile");
    expect(formatted).toContain("\n\n• Paket Web: Rp 1,5jt.");
    expect(formatted).toContain("\n\n1. Mulai dari web profile.");
    expect(formatted).toContain("\n\n2. Lanjut ke aplikasi.");
  });

  it("TEST 10.3: ChatStylerFormatter dan JsonParser menjaga keutuhan blok kode program & menormalisasi literal slash-n", () => {
    const rawWithCode = "Berikut contoh kode Rust:\n```rust\nfn main() {\n    let result = 2 + 3;\n    println!(\"Hasil: {}\", result);\n}\n```\nSelesai.";
    const clean = JsonParser.sanitizeRawAiReply(rawWithCode);
    const styled = ChatStylerFormatter.format(clean, "whatsapp");

    // Blok kode program harus tetap utuh dan tidak terhapus
    expect(styled).toContain("```rust");
    expect(styled).toContain("fn main()");
    expect(styled).toContain("println!(\"Hasil: {}\", result);");
    expect(styled).toContain("```");

    // String dengan literal \\n harus terkonversi menjadi newline nyata
    const rawLiteralEscaped = "fn main() {\\n    println!(\"Halo\");\\n}";
    const styledEscaped = ChatStylerFormatter.format(rawLiteralEscaped, "whatsapp");
    expect(styledEscaped).toContain("\n");
  });

  it("TEST 10.4: WhatsAppTextFormatter di modul Bot menata teks dengan aman", () => {
    const botText = "Halo Tuan Muda! Pilihan utama: **Paket Pro** seharga `Rp 500.000`.";
    const result = WhatsAppTextFormatter.format(botText);

    expect(result).toBe("Halo Tuan Muda! Pilihan utama: *Paket Pro* seharga `Rp 500.000`.");
  });

  it("TEST 10.5 (Live LLM): Permintaan kode program ke AI menghasilkan blok kode berindentasi (bukan single line)", async () => {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await aiAdapter.extractChatResponse(
      "Halo kalo 2 + 3 di buatin kode rust jadi seperti apa ?",
      "assistant",
      {
        businessName: "Jasting",
        businessType: "jasa pembuatan software",
        botName: "Enbee asistant",
        customPersonaPrompt: "Panggil owner dengan 'Tuan Muda'.",
      }
    );

    console.log("[TEST 10.5 AI Reply]:\n", result.reply);

    expect(result.reply).toBeTruthy();
    // Mengandung syntax Rust yang relevan
    expect(result.reply.toLowerCase()).toContain("fn main");
    // Tidak boleh hanya 1 baris bersambung tanpa enter (harus multi-line berindentasi)
    expect(result.reply.split("\n").length).toBeGreaterThanOrEqual(4);
  }, 45000);

  it("TEST 10.6 (Live LLM): Rekomendasi paket/layanan AI terstruktur dengan bullet points dan jeda baris lega", async () => {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await aiAdapter.extractChatResponse(
      "Menurutmu jika aku mau buka paket baru untuk bisnisku apa yg bisa kamu sarankan ?",
      "assistant",
      {
        businessName: "Jasting",
        businessType: "jasa pembuatan software",
        botName: "Enbee asistant",
        customPersonaPrompt: "Panggil owner dengan 'Tuan Muda'.",
        knowledgeBaseContext: "Layanan resmi Jasting:\n1. Website Company Profile: Rp 500.000\n2. Sistem Informasi Web: Rp 1,5 - 10 juta\n3. Aplikasi Android: Rp 3 - 50 juta",
      }
    );

    console.log("[TEST 10.6 AI Reply]:\n", result.reply);

    expect(result.reply).toBeTruthy();
    // Memiliki struktur baris baru (\n) yang lega, bukan 1 paragraf padat
    expect(result.reply.split("\n").length).toBeGreaterThanOrEqual(3);
    // Menggunakan bullet point '•' atau pemisahan poin bernomor
    const hasBulletsOrNumbers = result.reply.includes("•") || result.reply.includes("-") || /\d+[.)]/.test(result.reply);
    expect(hasBulletsOrNumbers).toBe(true);
    // Transparansi saran AI
    expect(result.reply.toLowerCase()).toMatch(/saran|asumsi|analisis|belum tercatat/);
  }, 40000);
});
