import type { ModelProfile } from './eval.types';

export const DEFAULT_FALLBACK_FREE_MODEL = 'nvidia/nemotron-3.5-lightning-free';

export const INITIAL_MODEL_PROFILES: ModelProfile[] = [
  // 10 Model Berbayar Unggulan (VLM, LMM, LLM)
  {
    modelId: 'openai/gpt-4o',
    name: 'OpenAI GPT-4o (Omni VLM)',
    tier: 'pro',
    category: 'VLM',
    temperature: 0.2,
    maxTokens: 1000,
    promptStyle: 'strict_json',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: true,
    stripThinkingTags: false,
    fallbackModelId: 'openai/gpt-4o-mini',
  },
  {
    modelId: 'anthropic/claude-sonnet-4.6',
    name: 'Claude 3.7 Sonnet (Hybrid VLM)',
    tier: 'pro',
    category: 'VLM',
    temperature: 0.3,
    maxTokens: 1200,
    promptStyle: 'strict_json',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: true,
    stripThinkingTags: false,
    fallbackModelId: 'anthropic/claude-haiku-4.5',
  },
  {
    modelId: 'google/gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image (VLM)',
    tier: 'pro',
    category: 'VLM',
    temperature: 0.2,
    maxTokens: 1000,
    promptStyle: 'strict_json',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: true,
    stripThinkingTags: false,
    fallbackModelId: 'google/gemini-2.5-flash',
  },
  {
    modelId: 'alibaba/qwen3-vl-instruct',
    name: 'Qwen 3 VL Instruct (VLM)',
    tier: 'pro',
    category: 'VLM',
    temperature: 0.2,
    maxTokens: 1000,
    promptStyle: 'few_shot_markdown',
    systemPromptLanguage: 'en',
    requiresFewShot: true,
    supportsJsonMode: false,
    stripThinkingTags: false,
    fallbackModelId: 'google/gemini-2.5-flash',
  },
  {
    modelId: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Fast LMM)',
    tier: 'pro',
    category: 'LMM',
    temperature: 0.2,
    maxTokens: 1000,
    promptStyle: 'strict_json',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: true,
    stripThinkingTags: false,
    fallbackModelId: 'openai/gpt-4o-mini',
  },
  {
    modelId: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini (Cost-Effective LMM)',
    tier: 'pro',
    category: 'LMM',
    temperature: 0.2,
    maxTokens: 800,
    promptStyle: 'strict_json',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: true,
    stripThinkingTags: false,
    fallbackModelId: DEFAULT_FALLBACK_FREE_MODEL,
  },
  {
    modelId: 'deepseek/deepseek-v4-flash-vision-exp',
    name: 'DeepSeek v4 Flash Vision Exp (LMM)',
    tier: 'pro',
    category: 'LMM',
    temperature: 0.3,
    maxTokens: 1000,
    promptStyle: 'few_shot_markdown',
    systemPromptLanguage: 'id',
    requiresFewShot: true,
    supportsJsonMode: false,
    stripThinkingTags: false,
    fallbackModelId: 'google/gemini-2.5-flash',
  },
  {
    modelId: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (Deep Reasoning LLM)',
    tier: 'pro',
    category: 'LLM',
    temperature: 0.6,
    maxTokens: 2000,
    promptStyle: 'bilingual_cot',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: false,
    stripThinkingTags: true,
    fallbackModelId: 'meta/llama-3.3-70b',
  },
  {
    modelId: 'anthropic/claude-haiku-4.5',
    name: 'Claude 3.5 Haiku (High Speed LLM)',
    tier: 'pro',
    category: 'LLM',
    temperature: 0.2,
    maxTokens: 800,
    promptStyle: 'strict_json',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: true,
    stripThinkingTags: false,
    fallbackModelId: 'openai/gpt-4o-mini',
  },
  {
    modelId: 'meta/llama-3.3-70b',
    name: 'Llama 3.3 70B Instruct (Enterprise LLM)',
    tier: 'pro',
    category: 'LLM',
    temperature: 0.2,
    maxTokens: 1000,
    promptStyle: 'few_shot_markdown',
    systemPromptLanguage: 'id',
    requiresFewShot: true,
    supportsJsonMode: false,
    stripThinkingTags: false,
    fallbackModelId: DEFAULT_FALLBACK_FREE_MODEL,
  },
  // Model Gratis Aktif
  {
    modelId: 'nvidia/nemotron-3.5-lightning-free',
    name: 'Nemotron 3.5 Lightning Free',
    tier: 'free',
    category: 'LLM',
    temperature: 0.1,
    maxTokens: 10000,
    promptStyle: 'plain_text_regex',
    systemPromptLanguage: 'id',
    requiresFewShot: false,
    supportsJsonMode: false,
    stripThinkingTags: false,
    fallbackModelId: 'gpt-4o-mini',
  },
  {
    modelId: 'reflection/beam-free',
    name: 'Reflection Beam Free',
    tier: 'free',
    category: 'LLM',
    temperature: 0.2,
    maxTokens: 800,
    promptStyle: 'few_shot_markdown',
    systemPromptLanguage: 'id',
    requiresFewShot: true,
    supportsJsonMode: false,
    stripThinkingTags: false,
    fallbackModelId: 'stealth/glyph-cluster',
  },
  {
    modelId: 'stealth/glyph-cluster',
    name: 'Stealth Glyph Cluster Free',
    tier: 'free',
    category: 'LLM',
    temperature: 0.2,
    maxTokens: 800,
    promptStyle: 'few_shot_markdown',
    systemPromptLanguage: 'id',
    requiresFewShot: true,
    supportsJsonMode: false,
    stripThinkingTags: false,
    fallbackModelId: DEFAULT_FALLBACK_FREE_MODEL,
  },
];

class ModelProfilesRegistry {
  private profiles = new Map<string, ModelProfile>();

  constructor() {
    for (const p of INITIAL_MODEL_PROFILES) {
      this.profiles.set(p.modelId, p);
    }
  }

  getProfile(modelId: string): ModelProfile {
    const existing = this.profiles.get(modelId);
    if (existing) return existing;

    const isFree = modelId.endsWith('-free') || modelId.includes('free');
    return {
      modelId,
      name: modelId,
      tier: isFree ? 'free' : 'pro',
      category: 'LLM',
      temperature: 0.3,
      maxTokens: 800,
      promptStyle: isFree ? 'few_shot_markdown' : 'strict_json',
      systemPromptLanguage: 'id',
      requiresFewShot: isFree,
      supportsJsonMode: !isFree,
      stripThinkingTags: modelId.includes('r1') || modelId.includes('reasoning'),
      fallbackModelId: DEFAULT_FALLBACK_FREE_MODEL,
    };
  }

  listProfiles(): ModelProfile[] {
    return Array.from(this.profiles.values());
  }

  listPaidProfiles(): ModelProfile[] {
    return this.listProfiles().filter((p) => p.tier === 'pro');
  }

  listFreeProfiles(): ModelProfile[] {
    return this.listProfiles().filter((p) => p.tier === 'free');
  }

  upsertProfile(profile: ModelProfile): void {
    this.profiles.set(profile.modelId, profile);
  }
}

export const modelProfilesRegistry = new ModelProfilesRegistry();
