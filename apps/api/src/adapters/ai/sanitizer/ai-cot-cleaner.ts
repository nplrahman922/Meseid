/**
 * AiCotCleaner:
 * Pembersih deterministik untuk memangkas monolog proses berpikir (Chain-of-Thought / Scratchpad)
 * dan meta-komentar bahasa Inggris yang kerap bocor dari model LLM sebelum sampai ke pengguna.
 */
export class AiCotCleaner {
  private static readonly COT_START_PATTERNS = [
    /The user (?:is asking|\([^)]*\) is|\b)[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
    /He wants me to[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
    /Let me review[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
    /Format requirements:[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
    /I need to (?:respond|answer|provide|balance)[\s\S]*?(?:Let me compose the reply:|Berikut adalah|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap)/i,
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

    // 1b. Bersihkan prompt echo pembuka yang sering dikutip mentah oleh model
    text = text.replace(/^["'“”]?\s*Halo Tuan Muda!['",\s]+Halo Kak!['")\s]+/gi, 'Halo Tuan Muda!\n\n').trim();

    // 1c. Hapus baris-baris monolog refleksi/analisis bahasa Inggris (meta-reasoning)
    const lines = text.split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return true;
      return !/^(?:[•\-*]|\d+\.)?\s*(?:There's also|The rules say|Let me re-read|Wait, actually|Wait, the prompt|Actually, looking|Looking at the|The API key is explicitly|This looks like a test|My draft|I should probably|I need to ensure|Draft:|Here's a thinking|One thing:|Check constraints:|Then:|And:|Instruksi Revisi|Identify the Core Task|Analyze User Input|Determine Response Strategy|Check against rules|Draft Response|Final check|It seems)\b/i.test(trimmedLine) &&
        !/\b(?:in the knowledge base: "API Key|looking at the prompt structure|test case or a formatted|actual user message in the chat interface|Identify the Core Task|Analyze User Input)\b/i.test(trimmedLine);
    });
    text = filteredLines.join('\n').trim();

    // 1d. Hapus blok proses berpikir/analisis di awal output model reasoning (Nemotron)
    if (/^(?:Here'?s (?:a|the) thinking process|1\.\s*\*?Analyze|1\.\s*\*?Identify|Analyzing|Thinking Process)/i.test(text)) {
      const naturalGreetingIdx = text.search(/\b(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap|Hai|Isi knowledgebase|Meseid|Untuk|Toko|Produk|Layanan|Ya|Tidak|Hello|Hi|Dear|Sure|Welcome|Certainly|Gue|Aku|こんにちは|はい|ありがとうございます)\b/i);
      if (naturalGreetingIdx > 0) {
        text = text.slice(naturalGreetingIdx).trim();
      } else {
        const parts = text.split(/\n\s*\n/);
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1].trim();
          if (lastPart.length > 10 && !/^\d+\./.test(lastPart)) {
            text = lastPart;
          }
        }
      }
    }

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
    if (/^(?:The user|He wants|She wants|Write a new reply|The improvement direction|So the auditor|This is contradictory|User asks)\b/i.test(text)) {
      const naturalGreetingIntro = text.search(/\b(?:Berikut|Tentu|Halo|Mohon maaf|Baik|Tuan Muda|Kak|Siap|Hai|Hello|Hi|Dear|Sure|Welcome|Certainly|Gue|Aku|こんにちは|はい|ありがとうございます)\b/i);
      if (naturalGreetingIntro > 0) {
        text = text.slice(naturalGreetingIntro).trim();
      }
    }

    return text;
  }

  /**
   * Mendeteksi apakah suatu teks murni monolog CoT/Scratchpad bahasa Inggris.
   */
  static isEnglishMonologue(rawText: string): boolean {
    if (!rawText || typeof rawText !== 'string') return false;
    const trimmed = rawText.trim();
    if (
      /^(?:The user\b|He wants\b|She wants\b|Write a new reply\b|The improvement direction\b|So the auditor\b|This is contradictory\b|In my previous\b|Format requirements:\b|Here's a thinking process:|User asks\b|Wait, actually\b|1\.\s*\*?Analyze|Let me (?:think|review|analyze|examine|check the prompt|compose|re-read|see what|balance|ensure|craft|determine)\b|I need to (?:respond|answer|provide|balance|ensure|check|analyze|follow|craft)\b)/i.test(trimmed) ||
      /\b(?:The user is asking|Let me review|Let me compose the reply:|In my previous response|There's also a "RAHASIA"|looking at the prompt structure|test case or a formatted|Identify the Core Task|Analyze User Input|Determine Response Strategy)\b/i.test(trimmed)
    ) {
      return true;
    }
    return false;
  }
}
