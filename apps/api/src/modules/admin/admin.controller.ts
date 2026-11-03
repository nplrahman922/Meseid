import { Tx } from "../../db/client";
import {
  logAdminOverviewAccessed,
  handleAdminOperationError,
  successResponse,
  SetContext,
} from "../../logs";
import {
  getAdminOverview,
  upsertAiModels,
  getAiModelsList,
  updateModelEnabledStatus,
} from "./admin.model";
import { aiAdapter } from "../../adapters/ai";

export interface AdminContext {
  runAdminTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: SetContext;
  query?: Record<string, string | undefined>;
  body?: any;
}

/**
 * Controller for GET /api/admin/overview
 */
export async function getAdminOverviewController({ runAdminTx, set }: AdminContext) {
  try {
    const stats = await runAdminTx(async (tx) => {
      return await getAdminOverview(tx);
    });

    logAdminOverviewAccessed();

    return successResponse({ stats }, "Admin overview");
  } catch (err: any) {
    return handleAdminOperationError(set, "get_admin_overview", err);
  }
}

/**
 * Controller for POST /api/admin/ai/sync
 * Manually triggers AI models synchronization from Vercel AI Gateway into PostgreSQL ai_models.
 */
export async function syncAiModelsController({ runAdminTx, set }: AdminContext) {
  try {
    const syncResult = await aiAdapter.syncModelsWithVercel({
      maxRetries: 3,
      retryDelayMs: 2000,
    });

    if (!syncResult.success) {
      throw new Error(syncResult.error || "Gagal mengambil katalog model dari Vercel AI Gateway.");
    }

    const upsertedCount = await runAdminTx(async (tx) => {
      const count = await upsertAiModels(tx, syncResult.models);

      await tx`
        INSERT INTO admin_audit_log (action, reason, metadata)
        VALUES (
          'SYNC_AI_MODELS',
          'Manual sync of AI models catalog from Vercel AI Gateway',
          ${tx.json({
            total_fetched: syncResult.total_fetched,
            total_synced: count,
            total_free: syncResult.total_free,
            total_pro: syncResult.total_pro,
            duration_ms: syncResult.duration_ms,
          })}
        );
      `;

      return count;
    });

    return successResponse(
      {
        total_fetched: syncResult.total_fetched,
        total_synced: upsertedCount,
        total_free: syncResult.total_free,
        total_pro: syncResult.total_pro,
        duration_ms: syncResult.duration_ms,
      },
      "Katalog model AI berhasil disinkronkan dari Vercel AI Gateway ke database."
    );
  } catch (err: any) {
    return handleAdminOperationError(set, "sync_ai_models", err);
  }
}

/**
 * Controller for GET /api/admin/ai/models
 * Retrieves all registered AI models from PostgreSQL.
 */
export async function getAiModelsController({ runAdminTx, set, query }: AdminContext) {
  try {
    const tier = query?.tier === "free" || query?.tier === "pro" ? query.tier : undefined;
    const enabled =
      query?.enabled === "true" ? true : query?.enabled === "false" ? false : undefined;

    const models = await runAdminTx(async (tx) => {
      return await getAiModelsList(tx, { tier, enabled });
    });

    return successResponse(
      {
        models,
        total: models.length,
      },
      "Daftar model AI di database"
    );
  } catch (err: any) {
    return handleAdminOperationError(set, "get_ai_models", err);
  }
}

/**
 * Controller for PATCH /api/admin/ai/models/:modelId/toggle
 * Enables or disables a specific AI model.
 */
export async function toggleAiModelController({
  runAdminTx,
  set,
  body,
}: AdminContext) {
  try {
    const modelId = body?.model_id;
    const enabled = Boolean(body?.enabled);

    if (!modelId) {
      set.status = 400;
      return {
        error: "INVALID_REQUEST",
        message: "Parameter model_id wajib diisi.",
      };
    }

    const updated = await runAdminTx(async (tx) => {
      return await updateModelEnabledStatus(tx, modelId, enabled);
    });

    if (!updated) {
      set.status = 404;
      return {
        error: "NOT_FOUND",
        message: `Model '${modelId}' tidak ditemukan.`,
      };
    }

    return successResponse(
      { model_id: modelId, enabled },
      `Model '${modelId}' berhasil diubah statusnya menjadi ${enabled ? "aktif" : "non-aktif"}.`
    );
  } catch (err: any) {
    return handleAdminOperationError(set, "toggle_ai_model", err);
  }
}

