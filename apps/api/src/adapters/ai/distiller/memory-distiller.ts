import { createModuleLogger } from '../../../logs';
import { chatWithFallback } from '../client/chat-fallback';

const aiLogger = createModuleLogger('ai-memory-distiller');

/**
 * Menganalisis riwayat pesan sebelumnya menggunakan model Free Tier inclusionai/ling-3.1-flash-1019
 * untuk menghasilkan intisari konteks percakapan (Memory Digest).
 */
export async function distillConversationContext(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  latestMessage: string = ''
): Promise<string | null> {
  if (!history || history.length === 0) {
    return null;
  }

  const DISTILLER_MODEL = 'inclusionai/ling-3.1-flash-1019';

  const formattedHistory = history
    .map((h) => `${h.role === 'user' ? 'Pelanggan' : 'Bot'}: ${h.content}`)
    .join('\n');

  const systemPrompt = `Kamu adalah AI Memory Distiller cerdas untuk chatbot bisnis UMKM.
Tugasmu adalah menganalisis riwayat percakapan lama dan pesan terkini, lalu merangkum intisari konteks dalam 2-3 kalimat padat.

FOKUS EKSTRAKSI:
1. Topik Utama: Produk, paket jasa, atau kendala apa yang sedang aktif dibahas?
2. Preferensi & Batasan Pengguna: Budget pengguna, kendala, atau permintaan khusus yang sudah disampaikan sebelumnya.
3. Rujukan Kata Ganti & Konteks Bersambung: Jelaskan maksud dari rujukan kata ganti (misal: "yang itu", "paket kedua", "bisa nego gak").

INSTRUKSI KETAT:
- Abaikan sapaan atau obrolan basa-basi usang.
- Kembalikan HANYA teks ringkasan konteks singkat tanpa pengantar atau salam penutup.`;

  const userPrompt = `--- RIWAYAT PERCAKAPAN SEBELUMNYA (${history.length} pesan) ---
${formattedHistory}
--------------------------------------------------
PESAN TERKINI PENGGUNA: "${latestMessage}"

Tuliskan ringkasan konteks memori aktif:`;

  try {
    const result = await chatWithFallback({
      model: DISTILLER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
      timeout_ms: 10000,
    });

    const cleaned = result.content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();

    return cleaned || null;
  } catch (err: any) {
    aiLogger.warn(`Gagal menjalankan distillConversationContext: ${err.message}. Lanjut tanpa memori digest.`);
    return null;
  }
}
