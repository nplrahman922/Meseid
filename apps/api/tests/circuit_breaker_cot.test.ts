import { describe, it, expect } from "bun:test";
import { AiCotCleaner } from "../src/adapters/ai/sanitizer/ai-cot-cleaner";
import { guardrailService } from "../src/modules/chat/guardrail.service";

describe("Circuit Breaker & Anti-CoT Protection Tests", () => {
  const sampleLeakedCot = `EnBee Assistance:
2.  Identify Persona/Role: I am "Asisten EnBee", the personal assistant for the business owner "PEMILIK USAHA" of "Meseid ID". The owner explicitly instructed me to address them as "Raja Sang Maharaja" (override default), but also there are rules about language and greetings.
3.  Check Hierarchy & Rules:

• Priority 1: Sapaan & Personalisasi Kustom. Owner said: "Pemilik Meseid ID eksplisit meminta dibangun sebagai 'Bang', mengoverride sebutan default 'Raja Sang Maharaja'". Wait, let me re-read carefully.
• Actually, the prompt says: "Pemilik Meseid ID eksplisit meminta dibangun sebagai 'Bang', mengoverride sebutan default 'Raja Sang Maharaja'". But then later: "Aturan Khusus: Wajib panggil pemilik dengan sapaan hormat 'Raja Sang Maharaja' secara konsisten dalam setiap balasan".
• There's a conflict or maybe two different parts. Let me re-read the whole prompt carefully.
• In "HIERARCHI PRIORITAS & PENYELARASAN GAYLE": Point 1 says: "Wajib mematuhi instruksi sapaan atau panggilan khusus yang ditentukan pemilik usaha pada "INSTRUKSI GAYA KOMUNIKASI USAHA" di bawah".
• This is tricky. I need to decide. Usually, in these prompts, the "INSTRUKSI GAYA KOMUNIKASI USAHA" section is the formal instruction, and "KONTEKS MEMORI" provides context.
• Given the hierarchy: Point 1 says "Aturan khusus dan gaya bicara yang ditentukan pemilik usaha pada instruksi di bawah MEMILIKI PRIORITAS UTAMA (meng-override gaya default)."
• I think the safest is to use "Raja Sang Maharaja" as per the "Aturan Khusus" section.`;

  it("1. AiCotCleaner.isEnglishMonologue mendeteksi bocoran CoT bahasa Inggris", () => {
    const isMonologue = AiCotCleaner.isEnglishMonologue(sampleLeakedCot);
    expect(isMonologue).toBe(true);
  });

  it("2. Word-Count / CoT Circuit Breaker langsung memotong monolog > 100 kata saat sapaan singkat", async () => {
    const result = await guardrailService.validateDraftReply({
      userMessage: "Halo kak",
      draftReply: sampleLeakedCot,
      persona: "assistant",
      businessName: "Meseid ID",
      customPersonaPrompt: 'Wajib panggil pemilik dengan sapaan hormat "Raja Sang Maharaja" secara konsisten dalam setiap balasan',
    });

    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("corrupted");
    expect(result.actionDirective).toBe("sanitize_clean");
    expect(result.judgeModel).toBe("circuit-breaker-engine");
    expect(result.correctedReply).toContain("Raja Sang Maharaja");
    expect(result.correctedReply).not.toContain("EnBee Assistance");
    expect(result.correctedReply).not.toContain("Identify Persona");
  });

  it("3. Tidak memicu false-positive pada permintaan laporan keuangan atau rekap pembukuan yang panjang", async () => {
    const longReport = `Berikut adalah rekapitulasi pembukuan operasional Meseid ID:
1. Pemasukan Penjualan: Rp 15.450.000 (32 transaksi)
2. Beban Pokok Penjualan (HPP): Rp 8.200.000
3. Biaya Operasional (Listrik, Kuota, Hosting): Rp 1.500.000
4. Laba Bersih Sementara: Rp 5.750.000 (Margin 37.2%)
Catatan: Semua pencatatan sudah diverifikasi dengan mutasi bank terbaru.`;

    // Permintaan dokumen/laporan tidak boleh dicegat oleh circuit breaker kata
    const words = longReport.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThan(30);

    const isMonologue = AiCotCleaner.isEnglishMonologue(longReport);
    expect(isMonologue).toBe(false);
  });
});
