export interface AiModelPresetRecord {
  id: string;
  preset_code: string;
  display_name: string;
  badge: string;
  description: string;
  tier_required: "free" | "pro";
  model_id: string;
  fallback_model_id: string | null;
  temperature: number;
  max_tokens: number;
  confidence_threshold: number;
  system_prompt_style: "strict_json" | "plain_text_regex";
  strip_thinking_tags: boolean;
  supports_vision: boolean;
  supports_audio: boolean;
  supports_web_search: boolean;
  supports_reasoning: boolean;
  score: number;
  extra_params: Record<string, any>;
  is_active: boolean;
  priority_order: number;
}

export interface OwnerSubscriptionTierInfo {
  plan_name: string;
  display_name: string;
  is_active: boolean;
  is_pro: boolean;
  current_period_end: Date | null;
}

export interface OwnerAccessiblePresetCard {
  id: string;
  preset_code: string;
  model_id: string;
  name: string;
  display_name: string;
  badge: string;
  description: string;
  tier: "free" | "pro";
  jenis: "Gratis" | "Berbayar";
  tipe: "LLM" | "LMM" | "VLM";
  score: number;
  supports_vision: boolean;
  supports_audio: boolean;
  supports_web_search: boolean;
  supports_reasoning: boolean;
  is_accessible: boolean;
  is_current: boolean;
}
