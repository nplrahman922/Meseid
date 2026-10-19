import { telegramBotManager } from './bot.manager';
import type { OutboundMessagePayload, OutboundApiResponse, BotInstanceConfig } from './models/types';

/**
 * Memulai layanan modul Telegram (menginisialisasi bot default dari .env jika ada).
 */
export async function startTelegramBot(): Promise<void> {
  console.log('[Telegram Module] Memulai modul Telegram Bot...');
  await telegramBotManager.initFromEnv();
}

/**
 * Mengirim pesan outbound ke Telegram melalui bot yang sesuai.
 */
export async function sendTelegramMessage(payload: OutboundMessagePayload): Promise<OutboundApiResponse> {
  return telegramBotManager.sendMessage(payload);
}

/**
 * Mendaftarkan bot baru (untuk kebutuhan multi-tenant bot).
 */
export async function registerTenantBot(config: BotInstanceConfig) {
  return telegramBotManager.registerBot(config);
}

export { telegramBotManager };
export * from './models/types';
