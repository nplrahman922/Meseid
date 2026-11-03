import {
  getBaileys,
  type WASocket,
  type WAMessage,
  type MessageUpsertType,
} from './baileys.loader';
import { commandController } from './controllers/command.controller';
import { chatController } from './controllers/chat.controller';
import { QuotedMessageExtractor } from './formatters/quoted-message.extractor';
import { whatsappLogger } from '../logs';

export class WhatsAppRouter {
  /**
   * Menerima dan merutekan event messages.upsert dari Baileys
   */
  async handleUpsert(
    sock: WASocket,
    upsert: { messages: WAMessage[]; type: MessageUpsertType },
    sessionId: string,
    botPhoneNumber: string,
    isConnected: boolean
  ): Promise<void> {
    // Hanya proses pesan baru bertipe 'notify'
    if (upsert.type !== 'notify') return;

    for (const msg of upsert.messages) {
      try {
        await this.routeSingleMessage(sock, msg, sessionId, botPhoneNumber, isConnected);
      } catch (err: any) {
        whatsappLogger.error(`Gagal memproses pesan WhatsApp: ${err.message}`, err, {
          sessionId,
          msgId: msg.key?.id ?? undefined,
          chatId: msg.key?.remoteJid ?? undefined,
        });
      }
    }
  }

  /**
   * Membedah dan mengarahkan satu pesan ke controller yang tepat
   */
  private async routeSingleMessage(
    sock: WASocket,
    msg: WAMessage,
    sessionId: string,
    botPhoneNumber: string,
    isConnected: boolean
  ): Promise<void> {
    // Abaikan pesan yang dikirim oleh bot sendiri
    if (msg.key.fromMe) return;

    // Abaikan update status broadcast WhatsApp
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast') return;

    if (!msg.message) return;

    // 1. Ekstraksi dan unwrap konten pesan (mendukung Disappearing Messages / Pesan Sementara)
    let msgContent = msg.message;
    if (msgContent?.ephemeralMessage?.message) {
      msgContent = msgContent.ephemeralMessage.message;
    }
    if (msgContent?.viewOnceMessage?.message) {
      msgContent = msgContent.viewOnceMessage.message;
    }
    if (msgContent?.viewOnceMessageV2?.message) {
      msgContent = msgContent.viewOnceMessageV2.message;
    }

    if (!msgContent) return;

    const { getContentType } = await getBaileys();
    const contentType = getContentType(msgContent);
    if (!contentType) return;

    // 2. Ekstraksi Balasan Tombol Interaktif (Interactive Buttons / List)
    if (
      contentType === 'buttonsResponseMessage' ||
      contentType === 'templateButtonReplyMessage' ||
      contentType === 'listResponseMessage' ||
      contentType === 'interactiveResponseMessage'
    ) {
      let selectedId = '';
      if (contentType === 'buttonsResponseMessage') {
        selectedId = msgContent.buttonsResponseMessage?.selectedButtonId || '';
      } else if (contentType === 'templateButtonReplyMessage') {
        selectedId = msgContent.templateButtonReplyMessage?.selectedId || '';
      } else if (contentType === 'listResponseMessage') {
        selectedId = msgContent.listResponseMessage?.singleSelectReply?.selectedRowId || '';
      } else if (contentType === 'interactiveResponseMessage') {
        const nativeFlow = msgContent.interactiveResponseMessage?.nativeFlowResponseMessage;
        selectedId = nativeFlow?.paramsJson || '';
      }

      if (selectedId) {
        await chatController.handleCallbackAction(
          sock,
          msg,
          selectedId,
          sessionId,
          botPhoneNumber
        );
        return;
      }
    }

    // 3. Ekstraksi Foto / Struk Belanja
    if (contentType === 'imageMessage') {
      const caption = msgContent.imageMessage?.caption || '';
      await chatController.handlePhotoMessage(
        sock,
        msg,
        caption,
        sessionId,
        botPhoneNumber
      );
      return;
    }

    // 4. Ekstraksi Pesan Teks
    let textContent = '';
    if (contentType === 'conversation') {
      textContent = msgContent.conversation || '';
    } else if (contentType === 'extendedTextMessage') {
      textContent = msgContent.extendedTextMessage?.text || '';
    }

    if (!textContent) return;

    // Bersihkan karakter tak kasat mata (BOM, LRM \u200E, RLM \u200F, Zero-Width Space)
    const cleanText = textContent
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
      .trim();

    const lower = cleanText.toLowerCase();

    // Rute Perintah Bot (/start, /help, /status atau teks natural)
    const isStart =
      lower === '/start' ||
      lower === '!start' ||
      lower === '.start' ||
      lower === 'start' ||
      lower === 'menu' ||
      lower === 'halo' ||
      lower === 'hai' ||
      lower.startsWith('/start ');

    if (isStart) {
      await commandController.handleStart(sock, remoteJid, sessionId, msg.pushName || undefined);
      return;
    }

    const isHelp =
      lower === '/help' ||
      lower === '!help' ||
      lower === '.help' ||
      lower === 'help' ||
      lower === 'bantuan' ||
      lower === 'panduan' ||
      lower.startsWith('/help ');

    if (isHelp) {
      await commandController.handleHelp(sock, remoteJid, sessionId);
      return;
    }

    const isStatus =
      lower === '/status' ||
      lower === '!status' ||
      lower === '.status' ||
      lower === 'status' ||
      lower === 'cek status' ||
      lower.startsWith('/status ');

    if (isStatus) {
      await commandController.handleStatus(
        sock,
        remoteJid,
        sessionId,
        botPhoneNumber,
        isConnected
      );
      return;
    }

    // Ekstraksi teks kutipan jika pesan berupa Reply
    const quotedText = QuotedMessageExtractor.extractQuotedText(msgContent);

    // Teruskan ke Chat Controller (pencatatan transaksi, tanya jawab, atau teks biasa)
    await chatController.handleTextMessage(
      sock,
      msg,
      cleanText,
      sessionId,
      botPhoneNumber,
      quotedText || undefined
    );
  }
}

export const whatsAppRouter = new WhatsAppRouter();
