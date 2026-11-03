export interface ActionButton {
  label: string;
  callback_data: string;
}

export interface InboundMessagePayload {
  channel: 'whatsapp';
  bot_id: string;
  external_message_id: string;
  sender_id: string;
  sender_name: string;
  sender_username?: string;
  chat_id: string;
  chat_type: 'private' | 'group';
  message_type: 'text' | 'photo' | 'document' | 'callback';
  text?: string;
  quoted_text?: string;
  is_from_me?: boolean;
  callback_data?: string;
  attachments?: Array<{
    file_id?: string;
    file_type: string;
    mime_type?: string;
    file_size?: number;
    data_base64?: string;
  }>;
  timestamp: number;
}

export interface InboundApiResponse {
  status: 'success' | 'error' | 'ignored';
  reply_text?: string;
  action_buttons?: ActionButton[];
  error?: string;
}

export interface OutboundMessagePayload {
  channel: 'whatsapp';
  session_id?: string;
  bot_id?: string;
  recipient_id: string;
  message: string;
  options?: {
    action_buttons?: ActionButton[];
  };
}

export interface OutboundApiResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface WhatsAppSessionConfig {
  sessionId: string;
  ownerId?: string;
  phoneNumber?: string;
  sessionPath?: string;
  printQRInTerminal?: boolean;
}

export interface WhatsAppSessionStatus {
  sessionId: string;
  status: 'connecting' | 'open' | 'close' | 'qr_ready' | 'logged_out';
  storage?: 'redis' | 'file';
  phoneNumber?: string;
  qr?: string;
  lastSeen?: number;
}
