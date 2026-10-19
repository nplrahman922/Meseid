import { createModuleLogger } from '../logger';

export const telegramLogger = createModuleLogger('telegram');

export function logMessageReceived(
  botId: string,
  externalMsgId: string,
  senderId: string,
  text: string,
  chatId: string
): void {
  telegramLogger.info(`Pesan masuk dari user ${senderId}: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`, {
    action: 'message_received',
    botId,
    externalMsgId,
    senderId,
    chatId,
  });
}

export function logPhotoReceived(
  botId: string,
  externalMsgId: string,
  senderId: string,
  fileId: string,
  chatId: string
): void {
  telegramLogger.info(`Foto/struk masuk dari user ${senderId}`, {
    action: 'photo_received',
    botId,
    externalMsgId,
    senderId,
    fileId,
    chatId,
  });
}

export function logCallbackReceived(
  botId: string,
  callbackData: string,
  senderId: string
): void {
  telegramLogger.info(`Aksi tombol callback ditekan oleh user ${senderId}: "${callbackData}"`, {
    action: 'callback_received',
    botId,
    senderId,
    callbackData,
  });
}

export function logBotRegistered(
  botId: string,
  username: string,
  mode: string
): void {
  telegramLogger.info(`Bot @${username} (ID: ${botId}) berhasil didaftarkan. Mode: ${mode.toUpperCase()}`, {
    action: 'bot_registered',
    botId,
    username,
    mode,
  });
}

export function logBotError(botId: string, message: string, error?: any): void {
  telegramLogger.error(`Error pada bot ID ${botId}: ${message}`, error, {
    action: 'bot_error',
    botId,
  });
}
