import type { WASocket } from '../baileys.loader';
import type { WhatsAppSessionConfig } from '../models/types';

export interface WhatsAppSessionEntry {
  sessionId: string;
  sock: WASocket;
  config: WhatsAppSessionConfig;
  status: 'connecting' | 'open' | 'close' | 'qr_ready' | 'logged_out' | 'conflict';
  storage: 'redis' | 'file';
  qr?: string;
  phoneNumber?: string;
  conflictReason?: string;
  reconnectAttempts: number;
  reconnectTimer?: NodeJS.Timeout;
  clearSession?: () => Promise<void>;
}
