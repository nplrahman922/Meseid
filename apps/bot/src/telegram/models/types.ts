export interface ActionButton {
  label: string;
  callback_data: string;
}

export interface InboundMessagePayload {
  channel: 'telegram';
  bot_id: string;
  external_message_id: string;
  sender_id: string;
  sender_name: string;
  sender_username?: string;
  chat_id: string;
  chat_type: 'private' | 'group' | 'supergroup' | 'channel';
  message_type: 'text' | 'photo' | 'document' | 'callback';
  text?: string;
  callback_data?: string;
  attachments?: Array<{
    file_id: string;
    file_type: string;
    mime_type?: string;
    file_size?: number;
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
  channel: 'telegram';
  bot_id?: string;
  recipient_id: string;
  message: string;
  options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    action_buttons?: ActionButton[];
  };
}

export interface OutboundApiResponse {
  success: boolean;
  message_id?: number;
  error?: string;
}

export interface BotInstanceConfig {
  botId: string;
  token: string;
  mode?: 'polling' | 'webhook';
  webhookUrl?: string;
  ownerId?: string;
}
