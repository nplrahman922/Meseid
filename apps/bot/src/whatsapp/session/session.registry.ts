import type { WhatsAppSessionEntry } from './session.types';
import type { WhatsAppSessionStatus } from '../models/types';

export class WhatsAppSessionRegistry {
  private sessions: Map<string, WhatsAppSessionEntry> = new Map();

  set(sessionId: string, entry: WhatsAppSessionEntry): void {
    this.sessions.set(sessionId, entry);
  }

  get(sessionId?: string): WhatsAppSessionEntry | undefined {
    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    if (sessionId) {
      for (const entry of this.sessions.values()) {
        if (entry.phoneNumber === sessionId) {
          return entry;
        }
      }
    }

    if (this.sessions.size === 1) {
      return this.sessions.values().next().value;
    }

    return undefined;
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getAll(): Map<string, WhatsAppSessionEntry> {
    return this.sessions;
  }

  getStatuses(): WhatsAppSessionStatus[] {
    const statuses: WhatsAppSessionStatus[] = [];
    for (const [id, entry] of this.sessions.entries()) {
      statuses.push({
        sessionId: id,
        status: entry.status,
        storage: entry.storage,
        phoneNumber: entry.phoneNumber,
        qr: entry.qr,
      });
    }
    return statuses;
  }

  getQr(sessionId?: string): string | undefined {
    const entry = this.get(sessionId);
    return entry?.qr;
  }

  clear(): void {
    this.sessions.clear();
  }
}

export const sessionRegistry = new WhatsAppSessionRegistry();
