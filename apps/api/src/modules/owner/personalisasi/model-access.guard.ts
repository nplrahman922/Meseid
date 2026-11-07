import { Tx } from "../../../db/client";
import { ModelAccessError } from "./presets/model-access.error";
import { getOwnerSubscriptionTierAction } from "./presets/actions/get-owner-subscription-tier.action";
import { validatePresetTierAccessAction } from "./presets/actions/validate-preset-tier-access.action";
import { listActivePresetsAction } from "./presets/actions/list-active-presets.action";
import type { OwnerSubscriptionTierInfo } from "./presets/preset.types";

export { ModelAccessError };
export type { OwnerSubscriptionTierInfo as OwnerSubscriptionInfo };

export interface AiModelAccessRecord {
  id: string;
  provider: string;
  model_id: string;
  tier: "free" | "pro";
  enabled: boolean;
  currency: string;
  price_input_per_1m: string;
  price_output_per_1m: string;
}

export interface OwnerAccessibleModel {
  id: string;
  provider: string;
  model_id: string;
  name: string;
  tier: "free" | "pro";
  jenis: "Gratis" | "Berbayar";
  tipe: "LLM" | "LMM" | "VLM";
  score: number;
  badge?: string;
  currency: string;
  price_input_per_1m: string;
  price_output_per_1m: string;
  is_accessible: boolean;
  is_current: boolean;
}

export async function getOwnerSubscriptionInfo(
  tx: Tx,
  ownerId: string
): Promise<OwnerSubscriptionTierInfo> {
  return getOwnerSubscriptionTierAction(tx, ownerId);
}

export async function validateModelAccessForOwner(
  tx: Tx,
  ownerId: string,
  modelId: string
): Promise<{
  allowed: boolean;
  model: AiModelAccessRecord;
  subscription: OwnerSubscriptionTierInfo;
}> {
  const result = await validatePresetTierAccessAction(tx, ownerId, modelId);
  const subscription = await getOwnerSubscriptionTierAction(tx, ownerId);

  const modelRecord: AiModelAccessRecord = {
    id: result.preset.id,
    provider: result.preset.model_id.split("/")[0] || "ai",
    model_id: result.preset.model_id,
    tier: result.preset.tier_required,
    enabled: result.preset.is_active,
    currency: "USD",
    price_input_per_1m: "0.00",
    price_output_per_1m: "0.00",
  };

  return {
    allowed: true,
    model: modelRecord,
    subscription,
  };
}

export async function getAvailableModelsForOwner(
  tx: Tx,
  ownerId: string
): Promise<{
  subscription: OwnerSubscriptionTierInfo;
  current_model_id: string | null;
  models: OwnerAccessibleModel[];
}> {
  const subscription = await getOwnerSubscriptionTierAction(tx, ownerId);
  const presets = await listActivePresetsAction(tx);

  const [botConfig] = await tx<{ selected_model_id: string | null }[]>`
    SELECT selected_model_id
    FROM bot_configs
    WHERE owner_id = ${ownerId}::uuid
    LIMIT 1;
  `;

  const activeSelectedId = botConfig?.selected_model_id || (subscription.is_pro ? "google/gemini-2.5-flash" : "nvidia/nemotron-3.5-lightning-free");

  const models: OwnerAccessibleModel[] = presets.map((p) => {
    const isAccessible = subscription.is_pro ? true : p.tier_required === "free";
    const isCurrent = p.preset_code === activeSelectedId || p.model_id === activeSelectedId;

    return {
      id: p.id,
      provider: p.model_id.split("/")[0] || "ai",
      model_id: p.model_id,
      name: p.display_name,
      tier: p.tier_required,
      jenis: p.tier_required === "free" ? "Gratis" : "Berbayar",
      tipe: p.supports_vision ? "VLM" : "LLM",
      score: p.score,
      badge: p.badge,
      currency: "USD",
      price_input_per_1m: "0.00",
      price_output_per_1m: "0.00",
      is_accessible: isAccessible,
      is_current: isCurrent,
    };
  });

  return {
    subscription,
    current_model_id: activeSelectedId,
    models,
  };
}
