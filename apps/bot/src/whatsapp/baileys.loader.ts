import type * as BaileysModule from '@whiskeysockets/baileys';

let cachedBaileys: typeof BaileysModule | null = null;

/**
 * Memuat library @whiskeysockets/baileys secara dinamis (ESM dynamic import).
 * Ini memastikan kompatibilitas penuh dengan ekspor ESM modern dari Baileys
 * dan whatsapp-rust-bridge pada Node.js tanpa konflik loader CJS.
 */
export async function getBaileys(): Promise<typeof BaileysModule> {
  if (!cachedBaileys) {
    cachedBaileys = await import('@whiskeysockets/baileys');
  }
  return cachedBaileys;
}

export type {
  WASocket,
  WAMessage,
  MessageUpsertType,
  AuthenticationState,
} from '@whiskeysockets/baileys';
