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

export const TESTED_MODELS_METADATA: Record<
  string,
  {
    name: string;
    tipe: "LLM" | "LMM" | "VLM";
    score: number;
    badge: string;
    priority: number;
  }
> = {
  "google/gemini-2.5-flash": {
    name: "Google Gemini 2.5 Flash",
    tipe: "LMM",
    score: 97.9,
    badge: "Rekomendasi Utama",
    priority: 1,
  },
  "openai/gpt-4o-mini": {
    name: "OpenAI GPT-4o Mini",
    tipe: "LMM",
    score: 96.1,
    badge: "Tercepat & Paling Hemat",
    priority: 2,
  },
  "reflection/beam-free": {
    name: "Reflection Beam Free",
    tipe: "LMM",
    score: 95.5,
    badge: "Juara Kategori Gratis",
    priority: 3,
  },
  "anthropic/claude-haiku-4.5": {
    name: "Claude 3.5 Haiku",
    tipe: "LMM",
    score: 97.1,
    badge: "Akurat & Cepat",
    priority: 4,
  },
  "openai/gpt-4o": {
    name: "OpenAI GPT-4o Omni",
    tipe: "VLM",
    score: 97.9,
    badge: "Multimodal Vision",
    priority: 5,
  },
  "deepseek/deepseek-r1": {
    name: "DeepSeek R1",
    tipe: "LLM",
    score: 96.7,
    badge: "Penalaran Mendalam",
    priority: 6,
  },
  "nvidia/nemotron-3.5-lightning-free": {
    name: "NVIDIA Nemotron 3.5 Free",
    tipe: "LLM",
    score: 94.0,
    badge: "Gratis Percakapan",
    priority: 7,
  },
  "alibaba/qwen3-vl-instruct": {
    name: "Qwen 3 VL Instruct",
    tipe: "VLM",
    score: 90.0,
    badge: "Vision Multimodal",
    priority: 8,
  },
  "anthropic/claude-sonnet-4.6": {
    name: "Claude 3.7 Sonnet",
    tipe: "VLM",
    score: 90.2,
    badge: "Hybrid Reasoning",
    priority: 9,
  },
  "reflection/beam": {
    name: "Reflection Beam",
    tipe: "LLM",
    score: 92.0,
    badge: "Cadangan Gratis",
    priority: 10,
  },
  "google/gemini-3.1-flash-image": {
    name: "Gemini 3.1 Flash Image",
    tipe: "VLM",
    score: 89.5,
    badge: "Image Processing",
    priority: 11,
  },
  "meta/llama-3.3-70b": {
    name: "Llama 3.3 70B Instruct",
    tipe: "LLM",
    score: 88.0,
    badge: "Open Weights",
    priority: 12,
  },
  "deepseek/deepseek-v4-flash-vision-exp": {
    name: "DeepSeek V4 Vision Exp",
    tipe: "VLM",
    score: 87.5,
    badge: "Vision Experimental",
    priority: 13,
  },
};

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

  const defaultModelId = subscription.is_pro
    ? "google/gemini-2.5-flash"
    : "reflection/beam-free";
  const activeSelectedId = currentModelId || defaultModelId;

  const testedModelIds = Object.keys(TESTED_MODELS_METADATA);

  const rawModels = await tx<AiModelAccessRecord[]>`
    SELECT id, provider, model_id, tier, enabled, currency,
           price_input_per_1m, price_output_per_1m
    FROM ai_models
    WHERE enabled = true AND model_id = ANY(${testedModelIds})
  `;

  const models: OwnerAccessibleModel[] = rawModels
    .map((m) => {
      const meta = TESTED_MODELS_METADATA[m.model_id] || {
        name: m.model_id,
        tipe: "LLM" as const,
        score: 85,
        badge: "Teruji",
        priority: 99,
      };

      const isAccessible = subscription.is_pro ? true : m.tier === "free";
      const isCurrent = m.model_id === activeSelectedId;

      return {
        id: m.id,
        provider: m.provider,
        model_id: m.model_id,
        name: meta.name,
        tier: m.tier as "free" | "pro",
        jenis: m.tier === "free" ? ("Gratis" as const) : ("Berbayar" as const),
        tipe: meta.tipe,
        score: meta.score,
        badge: meta.badge,
        currency: m.currency,
        price_input_per_1m: m.price_input_per_1m,
        price_output_per_1m: m.price_output_per_1m,
        is_accessible: isAccessible,
        is_current: isCurrent,
      };
    })
    .sort((a, b) => {
      const pA = TESTED_MODELS_METADATA[a.model_id]?.priority ?? 99;
      const pB = TESTED_MODELS_METADATA[b.model_id]?.priority ?? 99;
      return pA - pB;
    });

  return {
    subscription,
    current_model_id: activeSelectedId,
    models,
  };
}
