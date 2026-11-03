/**
 * Utilitas penata teks khusus platform WhatsApp.
 * Memastikan sintaks penekanan teks (seperti Markdown **bold**)
 * dinormalisasi ke format *bold* yang didukung penuh oleh WhatsApp.
 */
export class WhatsAppTextFormatter {
  static format(text: string): string {
    if (!text || !text.trim()) return text;

    let formatted = text.trim();

    // Normalisasi double escaping literal \n jika ada
    formatted = formatted.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '    ');

    // Lindungi blok kode program (triple backticks)
    const codeBlocks: string[] = [];
    formatted = formatted.replace(/(```[\s\S]*?```)/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Lindungi inline code (`code`)
    const inlineCodes: string[] = [];
    formatted = formatted.replace(/(`[^`\n]+`)/g, (match) => {
      inlineCodes.push(match);
      return `__INLINE_CODE_${inlineCodes.length - 1}__`;
    });

    // Ubah ***teks*** menjadi *_teks_* (bold italic)
    formatted = formatted.replace(/\*\*\*([^\*\n]+?)\*\*\*/g, '*_$1_*');

    // Ubah **teks** menjadi *teks* (bold WhatsApp)
    formatted = formatted.replace(/\*\*([^\*\n]+?)\*\*/g, '*$1*');

    // Kembalikan inline code
    formatted = formatted.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => {
      return inlineCodes[Number(idx)] || '';
    });

    // Kembalikan blok kode program
    formatted = formatted.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
      return codeBlocks[Number(idx)] || '';
    });

    return formatted;
  }
}
