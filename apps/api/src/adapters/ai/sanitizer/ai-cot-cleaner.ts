/**
 * AiCotCleaner:
 * Pembersih deterministik untuk memangkas monolog proses berpikir (Chain-of-Thought / Scratchpad)
 * dan meta-komentar bahasa Inggris yang kerap bocor dari model LLM sebelum sampai ke pengguna.
 */
export class AiCotCleaner {
  private static readonly COT_START_PATTERNS = [
    /The user is asking[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
    /Let me review[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
    /Format requirements:[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
    /I need to (?:respond|answer|provide)[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
  ];

  private static readonly META_REASONING_PATTERNS = [
    /.*?baikan di atas dengan ramah dan rapi!["”]?\s*[—–-]\s*/gi,
    /Write a new reply that fully complies[\s\S]*?(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Siap)/i,
    /The improvement direction says:[\s\S]*?(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Siap)/i,
    /So the auditor wants me to[\s\S]*?(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Siap)/i,
    /This is contradictory[\s\S]*?(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Siap)/i,
    /I think the safest interpretation[\s\S]*?(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Siap)/i,
  ];

  /**
   * Menghapus jejak monolog CoT/Scratchpad bahasa Inggris dari output mentah LLM.
   */
  static cleanThinkingArtifacts(rawText: string): string {
    if (!rawText || !rawText.trim()) return rawText;

    let text = rawText.trim();

    // 1. Hapus tag <think>...</think> jika ada
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Jika teks memuat penanda eksplisit akhir CoT: "Let me compose the reply: [TEKS]"
    const composeMarker = /(?:Let me compose the reply|Here is the reply|Draft reply|Balasan:)\s*:?\s*["“]?/i;
    const match = text.match(composeMarker);
    if (match && match.index !== undefined) {
      let afterMarker = text.slice(match.index + match[0].length).trim();
      // Bersihkan tanda petik penutup yang tersisa di akhir
      afterMarker = afterMarker.replace(/["”]+$/g, '').trim();
      if (afterMarker.length > 5) {
        return afterMarker;
      }
    }

    // 3. Potong pola-pola monolog CoT awal jika bocor di depan teks balasan
    for (const pattern of this.COT_START_PATTERNS) {
      if (pattern.test(text)) {
        text = text.replace(pattern, (matched) => {
          // Ambil kata pembuka bahasa Indonesia yang tertangkap di akhir pola
          const lastWords = matched.match(/(Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)[\s\S]*$/i);
          return lastWords ? lastWords[0] : '';
        }).trim();
      }
    }

    // 4. Potong pola-pola meta-reasoning / prompt echo auditor
    for (const pattern of this.META_REASONING_PATTERNS) {
      if (pattern.test(text)) {
        text = text.replace(pattern, (matched) => {
          const matchIndonesian = matched.match(/(Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Siap)[\s\S]*$/i);
          return matchIndonesian ? matchIndonesian[0] : '';
        }).trim();
      }
    }

    // 5. Jika teks masih diawali kalimat meta bahasa Inggris murni
    if (/^(?:The user is asking|Write a new reply|The improvement direction|So the auditor|This is contradictory)\b/i.test(text)) {
      const indonesianIntro = text.search(/\b(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap|Hai)\b/i);
      if (indonesianIntro > 0) {
        text = text.slice(indonesianIntro).trim();
      }
    }

    return text;
  }
}
