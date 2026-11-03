/**
 * Utilitas ekstraksi pesan yang dikutip (Quoted / Replied Message) dari payload Baileys WhatsApp.
 * Mendukung ekstraksi dari percakapan teks, extended text, caption foto/video/dokumen,
 * dan tombol interaktif.
 */
export class QuotedMessageExtractor {
  static extractQuotedText(msgContent: any): string | null {
    if (!msgContent) return null;

    // Ambil contextInfo dari berbagai varian pesan yang mendukung quote
    const contextInfo =
      msgContent.extendedTextMessage?.contextInfo ||
      msgContent.imageMessage?.contextInfo ||
      msgContent.videoMessage?.contextInfo ||
      msgContent.documentMessage?.contextInfo ||
      msgContent.buttonsResponseMessage?.contextInfo ||
      msgContent.templateButtonReplyMessage?.contextInfo ||
      msgContent.listResponseMessage?.contextInfo;

    const quoted = contextInfo?.quotedMessage;
    if (!quoted) return null;

    // 1. Pesan teks langsung
    if (typeof quoted.conversation === 'string' && quoted.conversation.trim()) {
      return quoted.conversation.trim();
    }

    // 2. Extended text message
    if (typeof quoted.extendedTextMessage?.text === 'string' && quoted.extendedTextMessage.text.trim()) {
      return quoted.extendedTextMessage.text.trim();
    }

    // 3. Caption media (gambar, video, dokumen)
    if (typeof quoted.imageMessage?.caption === 'string' && quoted.imageMessage.caption.trim()) {
      return quoted.imageMessage.caption.trim();
    }
    if (typeof quoted.videoMessage?.caption === 'string' && quoted.videoMessage.caption.trim()) {
      return quoted.videoMessage.caption.trim();
    }
    if (typeof quoted.documentMessage?.caption === 'string' && quoted.documentMessage.caption.trim()) {
      return quoted.documentMessage.caption.trim();
    }

    // 4. Tombol respons
    if (typeof quoted.buttonsResponseMessage?.selectedDisplayText === 'string') {
      return quoted.buttonsResponseMessage.selectedDisplayText.trim();
    }
    if (typeof quoted.templateButtonReplyMessage?.selectedDisplayText === 'string') {
      return quoted.templateButtonReplyMessage.selectedDisplayText.trim();
    }

    return null;
  }
}
