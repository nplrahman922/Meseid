import type { AiTransactionItem, BusinessContext } from '../types';

export type EvalMetricKey =
  | 'schema_validity'
  | 'kb_groundedness'
  | 'anti_hallucination'
  | 'persona_adherence'
  | 'security_defense'
  | 'latency_efficiency';

export type TestCaseCategory =
  | 'transaction_extraction'
  | 'kb_retrieval'
  | 'hallucination_trap'
  | 'persona_tone'
  | 'prompt_injection'
  | 'vlm_receipt';

export interface EvalTestCase {
  id: string;
  category: TestCaseCategory;
  name: string;
  userMessage: string;
  persona: 'admin' | 'assistant';
  businessContext: BusinessContext;
  expectedIntent?: 'expense' | 'income' | 'inquiry' | 'general';
  expectedTransactions?: Array<{
    type: 'expense' | 'income';
    minAmount?: number;
    maxAmount?: number;
    category?: string;
  }>;
  mustContainKeywords?: string[];
  forbiddenKeywords?: string[];
  requiresStrictJson?: boolean;
}

export interface SingleTestResult {
  testId: string;
  passed: boolean;
  score: number; // 0 - 100
  metricBreakdown: Record<EvalMetricKey, number>;
  rawOutput: string;
  extractedReply: string;
  latencyMs: number;
  tokensUsed: number;
  critique: string;
}

export interface ModelEvalSummary {
  modelId: string;
  modelName: string;
  tier: 'free' | 'pro';
  category: 'LLM' | 'LMM' | 'VLM';
  totalTests: number;
  passedTests: number;
  overallScore: number; // 0 - 100
  passedThreshold: boolean;
  metricAverages: Record<EvalMetricKey, number>;
  averageLatencyMs: number;
  estimatedCostPer1kTurns: number;
  recommendedPromptStyle: 'strict_json' | 'few_shot_markdown' | 'bilingual_cot';
  results: SingleTestResult[];
}

export interface ModelProfile {
  modelId: string;
  name: string;
  tier: 'free' | 'pro';
  category: 'LLM' | 'LMM' | 'VLM';
  temperature: number;
  maxTokens: number;
  promptStyle: 'strict_json' | 'few_shot_markdown' | 'bilingual_cot';
  systemPromptLanguage: 'id' | 'en';
  requiresFewShot: boolean;
  supportsJsonMode: boolean;
  stripThinkingTags: boolean;
  fallbackModelId: string;
  specialInstructions?: string;
}
