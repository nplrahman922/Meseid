import { Tx } from "../../../../../db/client";
import type { AiModelPresetRecord } from "../preset.types";

/**
 * Mengambil seluruh preset bot aktif dari tabel ai_model_presets terurut berdasarkan priority_order.
 * Mode produksi database murni.
 */
export async function listActivePresetsAction(tx: Tx): Promise<AiModelPresetRecord[]> {
  const rows = await tx<
    {
      id: string;
      preset_code: string;
      display_name: string;
      badge: string;
      description: string;
      tier_required: "free" | "pro";
      model_id: string;
      fallback_model_id: string | null;
      temperature: string | number;
      max_tokens: number;
      confidence_threshold: string | number;
      system_prompt_style: "strict_json" | "plain_text_regex";
      strip_thinking_tags: boolean;
      supports_vision: boolean;
      supports_audio: boolean;
      supports_web_search: boolean;
      supports_reasoning: boolean;
      score: string | number;
      extra_params: any;
      is_active: boolean;
      priority_order: number;
    }[]
  >`
    SELECT id, preset_code, display_name, badge, description, tier_required,
           model_id, fallback_model_id, temperature, max_tokens, confidence_threshold,
           system_prompt_style, strip_thinking_tags, supports_vision, supports_audio,
           supports_web_search, supports_reasoning, score, extra_params, is_active, priority_order
    FROM ai_model_presets
    WHERE is_active = true
    ORDER BY priority_order ASC;
  `;

  return rows.map((r) => ({
    ...r,
    temperature: Number(r.temperature),
    confidence_threshold: Number(r.confidence_threshold),
    score: Number(r.score),
    extra_params: typeof r.extra_params === "object" && r.extra_params !== null ? r.extra_params : {},
  }));
}
