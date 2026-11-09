export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string | any[];
}

export interface AiModelPricing {
  input: string;
  output: string;
}

export interface AiModelInfo {
  id: string;
  name: string;
  owned_by: string;
  context_window: number;
  max_tokens: number;
  is_free: boolean;
  pricing?: AiModelPricing;
  modalities?: {
    input: string[];
    output: string[];
  };
  tags?: string[];
  description?: string;
}

export interface AiChatOptions {
  model?: string;
  messages: AiMessage[];
  temperature?: number;
  max_tokens?: number;
  timeout_ms?: number;
  response_format?: {
    type: 'json_object' | 'text';
  };
}

export interface AiUsageStats {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
}

export interface AiChatResult {
  content: string;
  model: string;
  usage: AiUsageStats;
  finish_reason?: string;
  attempts?: number;
  raw?: any;
}

export interface AiTransactionItem {
  type: 'expense' | 'income';
  amount: number;
  category: string;
  notes: string;
}

export interface AiScheduleItem {
  action: 'create' | 'delete' | 'none';
  title?: string;
  start_at?: string; // ISO 8601 string dalam zona waktu WIB (+07:00)
  end_at?: string;
  notes?: string;
}

export interface AiExtractionResult {
  reply: string;
  intent: 'expense' | 'income' | 'inquiry' | 'schedule' | 'general';
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  transaction: AiTransactionItem | null;
  transactions?: AiTransactionItem[];
  schedule?: AiScheduleItem | null;
  model_used: string;
  attempts: number;
  latency_ms: number;
  schema_valid: boolean;
}

export interface AiTestResult {
  success: boolean;
  model: string;
  prompt: string;
  reply: string;
  usage?: AiUsageStats;
  latency_ms: number;
  error?: string;
}

export interface SyncModelsOptions {
  forceRefresh?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  probeHealth?: boolean;
}

export interface ParsedAiModelRecord {
  provider: string;
  model_id: string;
  tier: 'free' | 'pro';
  currency: string;
  enabled: boolean;
  price_input_per_1m: number;
  price_output_per_1m: number;
  name?: string;
  context_window?: number;
}

export interface SyncAiModelsResult {
  success: boolean;
  total_fetched: number;
  total_synced: number;
  total_free: number;
  total_pro: number;
  models: ParsedAiModelRecord[];
  duration_ms: number;
  error?: string;
}

export interface AiModelDbRecord {
  id: string;
  provider: string;
  model_id: string;
  tier: 'free' | 'pro';
  currency: string;
  enabled: boolean;
  price_input_per_1m: string;
  price_output_per_1m: string;
  created_at: Date;
  updated_at: Date;
}

export type ActionDirective =
  | 'approve'          // Draf aman, lolos tanpa koreksi
  | 'apologize'        // Minta maaf santun karena data belum tersedia / kendala
  | 'refuse_politely'  // Tolak sopan pembocoran rahasia dapur ke pelanggan
  | 'clarify'          // Minta klarifikasi kebutuhan pengguna
  | 'direct_guide'     // Tuntun ke paket / kebijakan resmi di KB
  | 'sanitize_clean';  // Bersihkan dari artefak format JSON mentah

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BusinessContext {
  businessName?: string;
  businessType?: string;
  ownerName?: string;
  botName?: string;
  knowledgeBaseContext?: string;
  memoryDigest?: string;
  customPersonaPrompt?: string;
  responseLanguage?: string;
  recentTurns?: ConversationTurn[];
}


