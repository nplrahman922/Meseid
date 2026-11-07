import { Tx } from "../../../../../db/client";
import { ModelAccessError } from "../model-access.error";
import { getOwnerSubscriptionTierAction } from "./get-owner-subscription-tier.action";
import type { AiModelPresetRecord } from "../preset.types";

/**
 * Memvalidasi apakah owner berhak memilih preset model AI tertentu.
 * Menjamin akun Free tidak dapat mengaktifkan model Pro.
 */
export async function validatePresetTierAccessAction(
  tx: Tx,
  ownerId: string,
  targetCodeOrModelId: string
): Promise<{ allowed: boolean; preset: AiModelPresetRecord }> {
  if (!targetCodeOrModelId || typeof targetCodeOrModelId !== "string" || !targetCodeOrModelId.trim()) {
    throw new ModelAccessError(400, "INVALID_MODEL_ID", "Model ID / Preset Code tidak valid atau kosong.");
  }

  const cleanTarget = targetCodeOrModelId.trim();

  const [row] = await tx<
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
    WHERE (preset_code = ${cleanTarget} OR model_id = ${cleanTarget})
      AND is_active = true
    LIMIT 1;
  `;

  if (!row) {
    throw new ModelAccessError(400, "MODEL_NOT_FOUND", `Model / Preset '${cleanTarget}' tidak ditemukan di katalog sistem.`);
  }

  const preset: AiModelPresetRecord = {
    ...row,
    temperature: Number(row.temperature),
    confidence_threshold: Number(row.confidence_threshold),
    score: Number(row.score),
    extra_params: typeof row.extra_params === "object" && row.extra_params !== null ? row.extra_params : {},
  };

  const subscription = await getOwnerSubscriptionTierAction(tx, ownerId);

  if (preset.tier_required === "pro" && !subscription.is_pro) {
    throw new ModelAccessError(
      403,
      "TIER_INSUFFICIENT",
      `Model '${preset.display_name}' bertier Pro dan hanya tersedia untuk pengguna Paket Pro. Silakan upgrade paket langganan Anda.`
    );
  }

  return {
    allowed: true,
    preset,
  };
}
