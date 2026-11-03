import type { WASocket } from '@whiskeysockets/baileys';
import { whatsAppView } from '../views/whatsapp.view';
import { whatsappLogger } from '../../logs';

export class CommandController {
  /**
   * Menangani perintah /start
   */
  async handleStart(
    sock: WASocket,
    remoteJid: string,
    sessionId: string,
    pushName?: string
  ): Promise<void> {
    whatsappLogger.info(`Perintah /start diterima di WhatsApp sesi '${sessionId}' dari ${remoteJid}`, {
      action: 'command_start',
      sessionId,
      chatId: remoteJid,
      pushName,
    });

    const message = whatsAppView.renderWelcome(pushName, 'Asisten Bisnis Meseid');
    await sock.sendMessage(remoteJid, { text: message });
  }

  /**
   * Menangani perintah /help
   */
  async handleHelp(
    sock: WASocket,
    remoteJid: string,
    sessionId: string
  ): Promise<void> {
    whatsappLogger.info(`Perintah /help diterima di WhatsApp sesi '${sessionId}' dari ${remoteJid}`, {
      action: 'command_help',
      sessionId,
      chatId: remoteJid,
    });

    const message = whatsAppView.renderHelp();
    await sock.sendMessage(remoteJid, { text: message });
  }

  /**
   * Menangani perintah /status
   */
  async handleStatus(
    sock: WASocket,
    remoteJid: string,
    sessionId: string,
    phoneNumber: string,
    isConnected: boolean
  ): Promise<void> {
    whatsappLogger.info(`Perintah /status diterima di WhatsApp sesi '${sessionId}' dari ${remoteJid}`, {
      action: 'command_status',
      sessionId,
      chatId: remoteJid,
    });

    const message = whatsAppView.renderStatus(sessionId, phoneNumber, isConnected);
    await sock.sendMessage(remoteJid, { text: message });
  }
}

export const commandController = new CommandController();
