import type { Context, InlineKeyboard } from 'grammy';
import { telegramLogger } from '../../logs';

export class TelegramTextFormatter {
  private static readonly MAX_MESSAGE_LENGTH = 4000;

  /**
   * Mengonversi teks Markdown umum dari model AI menjadi Telegram Safe HTML.
   */
  static formatToTelegramHtml(markdown: string): string {
    if (!markdown) return '';

    // 1. Amankan kode blok sebelum escaping agar konten di dalamnya terlindungi
    const codeBlocks: string[] = [];
    let text = markdown.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (_, code) => {
      const placeholder = `@@@CODEBLOCK${codeBlocks.length}@@@`;
      codeBlocks.push(code);
      return placeholder;
    });

    const inlineCodes: string[] = [];
    text = text.replace(/`([^`\n]+)`/g, (_, code) => {
      const placeholder = `@@@INLINECODE${inlineCodes.length}@@@`;
      inlineCodes.push(code);
      return placeholder;
    });

    // 2. Escape karakter HTML dasar pada teks non-kode
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 3. Konversi format Markdown: Hyperlink web search
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

    // 4. Konversi format Markdown: Bold (**teks** atau __teks__)
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    text = text.replace(/__(.*?)__/g, '<b>$1</b>');

    // 5. Konversi format Markdown: Italic (*teks* atau _teks_)
    text = text.replace(/(?<![a-zA-Z0-9])\*([^*]+)\*(?![a-zA-Z0-9])/g, '<i>$1</i>');
    text = text.replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '<i>$1</i>');

    // 6. Kembalikan blok kode dengan tag <pre><code> dan <code> yang sudah di-escape
    for (let i = 0; i < inlineCodes.length; i++) {
      const escaped = inlineCodes[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      text = text.replace(`@@@INLINECODE${i}@@@`, `<code>${escaped}</code>`);
    }

    for (let i = 0; i < codeBlocks.length; i++) {
      const escaped = codeBlocks[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      text = text.replace(`@@@CODEBLOCK${i}@@@`, `<pre><code>${escaped}</code></pre>`);
    }

    return text;
  }

  /**
   * Memecah pesan panjang menjadi bagian-bagian yang tidak melebihi batas Telegram (4.096 karakter).
   */
  static splitIntoChunks(text: string, maxLength: number = TelegramTextFormatter.MAX_MESSAGE_LENGTH): string[] {
    if (!text || text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Cari batas pemisah alami (paragraf ganda, baris baru, atau spasi)
      let splitIdx = remaining.lastIndexOf('\n\n', maxLength);
      if (splitIdx === -1 || splitIdx < maxLength / 2) {
        splitIdx = remaining.lastIndexOf('\n', maxLength);
      }
      if (splitIdx === -1 || splitIdx < maxLength / 2) {
        splitIdx = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitIdx === -1) {
        splitIdx = maxLength;
      }

      chunks.push(remaining.slice(0, splitIdx).trim());
      remaining = remaining.slice(splitIdx).trim();
    }

    return chunks;
  }

  /**
   * Mengirim balasan ke obrolan Telegram dengan Safe HTML dan fallback instan ke plain text.
   */
  static async replyWithHtmlOrFallback(
    ctx: Context,
    rawText: string,
    options?: { reply_markup?: InlineKeyboard }
  ): Promise<void> {
    const htmlText = this.formatToTelegramHtml(rawText);
    const chunks = this.splitIntoChunks(htmlText);

    for (let i = 0; i < chunks.length; i++) {
      const isLastChunk = i === chunks.length - 1;
      const keyboard = isLastChunk ? options?.reply_markup : undefined;

      try {
        await ctx.reply(chunks[i], {
          parse_mode: 'HTML',
          reply_markup: keyboard,
          link_preview_options: { is_disabled: false },
        });
      } catch (err: any) {
        telegramLogger.warn(`Gagal mengirim dengan parse_mode HTML, fallback ke plain text: ${err.message}`);
        // Fallback aman: kirim potongan teks polos asli tanpa formatting error
        const plainChunks = this.splitIntoChunks(rawText);
        await ctx.reply(plainChunks[i] || rawText, {
          reply_markup: keyboard,
        }).catch((fallbackErr) => {
          telegramLogger.error(`Gagal mengirim balasan fallback Telegram: ${fallbackErr.message}`, fallbackErr);
        });
      }
    }
  }
}
