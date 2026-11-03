/**
 * Utilitas penata gaya teks percakapan (Chat Styler Formatter).
 * Memformat teks balasan AI agar rapi, ramah WhatsApp/Telegram,
 * mengubah markdown bold ke format WhatsApp (*teks*), memastikan baris baru pada bullet points,
 * dan menjaga keutuhan blok kode program.
 */
export class ChatStylerFormatter {
  static format(text: string, channel: 'whatsapp' | 'telegram' = 'whatsapp'): string {
    if (!text || !text.trim()) return text;

    let content = text.trim();

    // 0. Konversi string escape literal (\n, \t) menjadi karakter newline nyata jika LLM melakukan double escaping
    content = content.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '    ');

    // 1. Amankan blok kode program (triple backticks) agar isinya tidak terpengaruh format bold
    const codeBlocks: string[] = [];
    content = content.replace(/(```[\s\S]*?```)/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // 2. Amankan inline code (`code`) agar tidak terpengaruh
    const inlineCodes: string[] = [];
    content = content.replace(/(`[^`\n]+`)/g, (match) => {
      inlineCodes.push(match);
      return `__INLINE_CODE_${inlineCodes.length - 1}__`;
    });

    // 3. Konversi format Bold Markdown (**teks**) ke WhatsApp (*teks*)
    // Mengubah ***teks*** menjadi *_teks_* (bold italic)
    content = content.replace(/\*\*\*([^\*\n]+?)\*\*\*/g, '*_$1_*');
    // Mengubah **teks** menjadi *teks*
    content = content.replace(/\*\*([^\*\n]+?)\*\*/g, '*$1*');

    // 4. Ubah tanda strip (-) HANYA jika berada di awal baris menjadi bullet point (•)
    // PERBAIKAN BUG: Tanda strip di tengah kalimat/rentang angka TIDAK BOLEH dipotong!
    content = content.replace(/(^|\n)[ \t]*-[ \t]+/g, '$1• ');

    // 5. Pastikan bullet point (•) yang didahului teks biasa diawali baris baru ganda
    content = content.replace(/([^\n])\s+•\s+/g, '$1\n\n• ');

    // 6. Pastikan nomor urut poin (1., 2.) yang didahului titik kalimat diawali baris baru ganda
    content = content.replace(/([.!?])\s+(\d+[.)]\s+)/g, '$1\n\n$2');

    // 7. COMPACT LIST SPACING: Rapatkan jeda antar-item list berturut-turut (cukup 1 enter \n)
    while (/(•[^\n]+)\n\n+(•\s+)/.test(content)) {
      content = content.replace(/(•[^\n]+)\n\n+(•\s+)/g, '$1\n$2');
    }
    while (/(\d+[.)][^\n]+)\n\n+(\d+[.)]\s+)/.test(content)) {
      content = content.replace(/(\d+[.)][^\n]+)\n\n+(\d+[.)]\s+)/g, '$1\n$2');
    }

    // 8. Normalisasi spasi baris baru berlebih (maksimal 2 baris baru berurutan)
    content = content.replace(/\n{3,}/g, '\n\n');

    // 7. Pulihkan inline code
    content = content.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => {
      return inlineCodes[Number(idx)] || '';
    });

    // 8. Pulihkan blok kode program dengan baris baru yang rapi
    content = content.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
      const code = codeBlocks[Number(idx)] || '';
      return `\n\n${code.trim()}\n\n`;
    });

    // Rapikan kembali jika terjadi akumulasi baris baru di sekitar code block
    content = content.replace(/\n{3,}/g, '\n\n');

    return content.trim();
  }
}
