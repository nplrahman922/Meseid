import { Tx } from "../../db/client";
import type { ParsedAiModelRecord, AiModelDbRecord } from "../../adapters/ai/types";

export interface AdminOverviewStats {
  users: number;
  owners: number;
}

/**
 * Retrieves high-level operational counts for users and tenant owners
 * within an active admin context transaction.
 */
export async function getAdminOverview(tx: Tx): Promise<AdminOverviewStats> {
  const [totalUsers] = await tx<{ count: string }[]>`
    SELECT count(*)::text as count FROM users;
  `;
  const [totalOwners] = await tx<{ count: string }[]>`
    SELECT count(*)::text as count FROM owners;
  `;

  return {
    users: parseInt(totalUsers.count, 10),
    owners: parseInt(totalOwners.count, 10),
  };
}

/**
 * Batch upserts parsed AI models into PostgreSQL ai_models table.
 * Uses 100-row chunks for query stability.
 */
export async function upsertAiModels(
  tx: Tx,
  models: ParsedAiModelRecord[]
): Promise<number> {
  if (!models || models.length === 0) return 0;

  const chunkSize = 100;
  let totalUpserted = 0;

  for (let i = 0; i < models.length; i += chunkSize) {
    const chunk = models.slice(i, i + chunkSize).map((m) => ({
      provider: m.provider,
      model_id: m.model_id,
      tier: m.tier,
      currency: m.currency || "IDR",
      enabled: m.enabled ?? true,
      price_input_per_1m: m.price_input_per_1m ?? 0,
      price_output_per_1m: m.price_output_per_1m ?? 0,
    }));

    await tx`
      INSERT INTO ai_models ${tx(
        chunk,
        "provider",
        "model_id",
        "tier",
        "currency",
        "enabled",
        "price_input_per_1m",
        "price_output_per_1m"
      )}
      ON CONFLICT (model_id) DO UPDATE SET
        provider = EXCLUDED.provider,
        tier = EXCLUDED.tier,
        currency = EXCLUDED.currency,
        enabled = EXCLUDED.enabled,
        price_input_per_1m = EXCLUDED.price_input_per_1m,
        price_output_per_1m = EXCLUDED.price_output_per_1m,
        updated_at = now();
    `;

    totalUpserted += chunk.length;
  }

  return totalUpserted;
}

/**
 * Retrieves list of AI models with optional tier / enabled filters.
 */
export async function getAiModelsList(
  tx: Tx,
  filter?: { tier?: "free" | "pro"; enabled?: boolean }
): Promise<AiModelDbRecord[]> {
  if (filter?.tier && typeof filter.enabled === "boolean") {
    return await tx<AiModelDbRecord[]>`
      SELECT id, provider, model_id, tier, currency, enabled, price_input_per_1m, price_output_per_1m, created_at, updated_at
      FROM ai_models
      WHERE tier = ${filter.tier} AND enabled = ${filter.enabled}
      ORDER BY tier ASC, provider ASC, model_id ASC;
    `;
  }

  if (filter?.tier) {
    return await tx<AiModelDbRecord[]>`
      SELECT id, provider, model_id, tier, currency, enabled, price_input_per_1m, price_output_per_1m, created_at, updated_at
      FROM ai_models
      WHERE tier = ${filter.tier}
      ORDER BY tier ASC, provider ASC, model_id ASC;
    `;
  }

  if (typeof filter?.enabled === "boolean") {
    return await tx<AiModelDbRecord[]>`
      SELECT id, provider, model_id, tier, currency, enabled, price_input_per_1m, price_output_per_1m, created_at, updated_at
      FROM ai_models
      WHERE enabled = ${filter.enabled}
      ORDER BY tier ASC, provider ASC, model_id ASC;
    `;
  }

  return await tx<AiModelDbRecord[]>`
    SELECT id, provider, model_id, tier, currency, enabled, price_input_per_1m, price_output_per_1m, created_at, updated_at
    FROM ai_models
    ORDER BY tier ASC, provider ASC, model_id ASC;
  `;
}

/**
 * Updates enabled / health status of a specific model in PostgreSQL.
 */
export async function updateModelEnabledStatus(
  tx: Tx,
  modelId: string,
  enabled: boolean
): Promise<boolean> {
  const result = await tx`
    UPDATE ai_models
    SET enabled = ${enabled}, updated_at = now()
    WHERE model_id = ${modelId}
    RETURNING id;
  `;
  return result.length > 0;
}

