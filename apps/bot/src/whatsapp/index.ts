import { whatsAppBotManager } from './bot.manager';
import type {
  OutboundMessagePayload,
  OutboundApiResponse,
  WhatsAppSessionConfig,
} from './models/types';

/**
 * Memulai layanan modul WhatsApp Baileys (mode multi-tenant per-tenant).
 */
export async function startWhatsAppBot(): Promise<void> {
  console.log('[WhatsApp Module] Memulai modul WhatsApp Baileys (multi-tenant on-demand)...');
  await whatsAppBotManager.initFromEnv();
}

/**
 * Mengirim pesan outbound ke WhatsApp melalui sesi yang sesuai.
 */
export async function sendWhatsAppMessage(
  payload: OutboundMessagePayload
): Promise<OutboundApiResponse> {
  return whatsAppBotManager.sendMessage(payload);
}

/**
 * Mendaftarkan sesi baru (untuk kebutuhan multi-tenant WhatsApp).
 */
export async function registerTenantWhatsApp(config: WhatsAppSessionConfig) {
  return whatsAppBotManager.registerSession(config);
}

export { whatsAppBotManager };
export * from './models/types';
