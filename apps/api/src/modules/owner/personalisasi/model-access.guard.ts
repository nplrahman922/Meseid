import { Tx } from "../../../db/client";

export class ModelAccessError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 404,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ModelAccessError";
  }
}

export interface OwnerSubscriptionInfo {
  plan_name: string;
  display_name: string;
  is_active: boolean;
  is_pro: boolean;
  current_period_end: Date | null;
}

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
  tier: "free" | "pro";
  currency: string;
  price_input_per_1m: string;
  price_output_per_1m: string;
  is_accessible: boolean;
  is_current: boolean;
}

/**
 * Mengambil informasi langganan aktif owner.
 */
export async function getOwnerSubscriptionInfo(
  tx: Tx,
  ownerId: string
): Promise<OwnerSubscriptionInfo> {
  const [sub] = await tx<
    {
      plan_name: string;
      display_name: string;
      status: string;
      current_period_end: Date | null;
    }[]
  >`
    SELECT p.name AS plan_name, p.display_name, s.status, s.current_period_end
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.owner_id = ${ownerId}::uuid
    LIMIT 1;
  `;

  if (!sub) {
    return {
      plan_name: "gratis",
      display_name: "Paket Gratis",
      is_active: true,
      is_pro: false,
      current_period_end: null,
    };
  }

  const now = new Date();
  const isPeriodValid =
    !sub.current_period_end || new Date(sub.current_period_end) > now;
  const isActive = sub.status === "active" && isPeriodValid;
  const isPro = isActive && sub.plan_name.toLowerCase() === "pro";

  return {
    plan_name: sub.plan_name,
    display_name: sub.display_name,
    is_active: isActive,
    is_pro: isPro,
    current_period_end: sub.current_period_end,
  };
}

/**
 * Memvalidasi apakah owner berhak memilih model yang diminta.
 * - Model harus ada dan `enabled = true`.
 * - Jika model bertier `pro`, owner harus memiliki subscription `pro` yang aktif.
 */
export async function validateModelAccessForOwner(
  tx: Tx,
  ownerId: string,
  modelId: string
): Promise<{
  allowed: boolean;
  model: AiModelAccessRecord;
  subscription: OwnerSubscriptionInfo;
}> {
  if (!modelId || typeof modelId !== "string" || !modelId.trim()) {
    throw new ModelAccessError(
      400,
      "INVALID_MODEL_ID",
      "Model ID tidak valid atau kosong."
    );
  }

  const trimmedModelId = modelId.trim();

  const [model] = await tx<AiModelAccessRecord[]>`
    SELECT id, provider, model_id, tier, enabled, currency,
           price_input_per_1m, price_output_per_1m
    FROM ai_models
    WHERE model_id = ${trimmedModelId}
    LIMIT 1;
  `;

  if (!model) {
    throw new ModelAccessError(
      400,
      "MODEL_NOT_FOUND",
      `Model '${trimmedModelId}' tidak ditemukan di katalog sistem.`
    );
  }

  if (!model.enabled) {
    throw new ModelAccessError(
      400,
      "MODEL_DISABLED",
      `Model '${trimmedModelId}' saat ini dinonaktifkan oleh administrator.`
    );
  }

  const subscription = await getOwnerSubscriptionInfo(tx, ownerId);

  // Jika model adalah Pro dan user bukan Pro aktif -> 403 Forbidden
  if (model.tier === "pro" && !subscription.is_pro) {
    throw new ModelAccessError(
      403,
      "TIER_INSUFFICIENT",
      `Model '${trimmedModelId}' bertier Pro dan hanya tersedia untuk pengguna Paket Pro. Silakan upgrade paket langganan Anda.`
    );
  }

  return {
    allowed: true,
    model,
    subscription,
  };
}

/**
 * Mengambil daftar seluruh model aktif yang dapat dilihat oleh owner,
 * lengkap dengan penanda apakah model tersebut dapat diakses (is_accessible)
 * dan apakah sedang dipilih (is_current).
 */
export async function getAvailableModelsForOwner(
  tx: Tx,
  ownerId: string
): Promise<{
  subscription: OwnerSubscriptionInfo;
  current_model_id: string | null;
  models: OwnerAccessibleModel[];
}> {
  const subscription = await getOwnerSubscriptionInfo(tx, ownerId);

  const [botConfig] = await tx<{ selected_model_id: string | null }[]>`
    SELECT selected_model_id
    FROM bot_configs
    WHERE owner_id = ${ownerId}::uuid
    LIMIT 1;
  `;

  const currentModelId = botConfig?.selected_model_id || null;

  const rawModels = await tx<AiModelAccessRecord[]>`
    SELECT id, provider, model_id, tier, enabled, currency,
           price_input_per_1m, price_output_per_1m
    FROM ai_models
    WHERE enabled = true
    ORDER BY 
      CASE WHEN tier = 'free' THEN 0 ELSE 1 END ASC,
      provider ASC,
      model_id ASC;
  `;

  const models: OwnerAccessibleModel[] = rawModels.map((m) => {
    const isAccessible = subscription.is_pro ? true : m.tier === "free";
    const isCurrent = m.model_id === currentModelId;
    return {
      id: m.id,
      provider: m.provider,
      model_id: m.model_id,
      tier: m.tier,
      currency: m.currency,
      price_input_per_1m: m.price_input_per_1m,
      price_output_per_1m: m.price_output_per_1m,
      is_accessible: isAccessible,
      is_current: isCurrent,
    };
  });

  return {
    subscription,
    current_model_id: currentModelId,
    models,
  };
}
