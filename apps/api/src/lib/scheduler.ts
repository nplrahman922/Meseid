import { withSystemContext } from "../db/client";
import { aiAdapter } from "../adapters/ai";
import { upsertAiModels } from "../modules/admin/admin.model";
import { createModuleLogger } from "../logs";

const schedulerLogger = createModuleLogger("ai-scheduler");

export interface SchedulerHandle {
  stop: () => void;
  isRunning: () => boolean;
}

let activeInterval: Timer | null = null;

/**
 * Executes the AI models sync job inside the system context (meseid_system_ctx).
 */
export async function executeAiModelSyncJob(): Promise<{
  success: boolean;
  total_synced: number;
  duration_ms: number;
  error?: string;
}> {
  const startTime = Date.now();
  schedulerLogger.info("Memulai sinkronisasi berkala katalog model AI dari Vercel AI Gateway...");

  try {
    const syncResult = await aiAdapter.syncModelsWithVercel({
      maxRetries: 3,
      retryDelayMs: 2000,
    });

    if (!syncResult.success) {
      throw new Error(syncResult.error || "Gagal mengambil katalog dari Vercel AI Gateway.");
    }

    const upsertedCount = await withSystemContext(async (tx) => {
      const count = await upsertAiModels(tx, syncResult.models);

      await tx`
        INSERT INTO system_logs (level, component, code, message, metadata)
        VALUES (
          'info',
          'ai_scheduler',
          'AI_MODELS_SYNC_SUCCESS',
          'Pembaruan berkala katalog model AI berhasil.',
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

    const durationMs = Date.now() - startTime;
    schedulerLogger.info(
      `Pembaruan berkala selesai. ${upsertedCount} model berhasil disinkronkan (${durationMs}ms).`
    );

    return {
      success: true,
      total_synced: upsertedCount,
      duration_ms: durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    schedulerLogger.error(`Pembaruan berkala gagal: ${err.message}`, err);

    try {
      await withSystemContext(async (tx) => {
        await tx`
          INSERT INTO system_logs (level, component, code, message, metadata)
          VALUES (
            'error',
            'ai_scheduler',
            'ERR_AI_GATEWAY_SYNC',
            ${err.message || "Gagal sinkronisasi katalog model AI"},
            ${tx.json({ error: err.stack || err.message, duration_ms: durationMs })}
          );
        `;
      });
    } catch (logErr) {
      schedulerLogger.error("Gagal mencatat error ke system_logs:", logErr);
    }

    return {
      success: false,
      total_synced: 0,
      duration_ms: durationMs,
      error: err.message,
    };
  }
}

/**
 * Checks if the ai_models table has not been updated within maxStaleHours.
 * If stale or empty, triggers a background sync immediately.
 */
export async function checkAndRunStartupSync(maxStaleHours: number = 24): Promise<boolean> {
  try {
    const isStale = await withSystemContext(async (tx) => {
      const [latest] = await tx<{ max_updated: Date | null; count: string }[]>`
        SELECT max(updated_at) as max_updated, count(*)::text as count FROM ai_models;
      `;

      if (!latest || parseInt(latest.count, 10) === 0 || !latest.max_updated) {
        return true;
      }

      const staleThreshold = Date.now() - maxStaleHours * 60 * 60 * 1000;
      return new Date(latest.max_updated).getTime() < staleThreshold;
    });

    if (isStale) {
      schedulerLogger.info("Katalog model AI terdeteksi usang/kosong pada startup. Menjalankan sinkronisasi...");
      await executeAiModelSyncJob();
      return true;
    }

    schedulerLogger.info("Katalog model AI masih segar. Tidak perlu sinkronisasi awal saat startup.");
    return false;
  } catch (err: any) {
    schedulerLogger.warn(`Pemeriksaan startup sync gagal: ${err.message}`);
    return false;
  }
}

/**
 * Starts the 24-hour periodic AI models sync background scheduler.
 */
export function startAiModelSyncScheduler(intervalHours: number = 24): SchedulerHandle {
  if (activeInterval) {
    clearInterval(activeInterval);
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  schedulerLogger.info(
    `Scheduler sinkronisasi model AI aktif. Interval: setiap ${intervalHours} jam (${intervalMs}ms).`
  );

  // Trigger non-blocking check on startup
  checkAndRunStartupSync(intervalHours).catch((err) => {
    schedulerLogger.error("Error pada startup AI model check:", err);
  });

  // Schedule recurring daily task
  activeInterval = setInterval(() => {
    executeAiModelSyncJob().catch((err) => {
      schedulerLogger.error("Error pada siklus periodic AI model sync:", err);
    });
  }, intervalMs);

  // Unref so timer doesn't keep node/bun process alive during test exits or shutdown
  if (typeof (activeInterval as any)?.unref === "function") {
    (activeInterval as any).unref();
  }

  return {
    stop: () => {
      if (activeInterval) {
        clearInterval(activeInterval);
        activeInterval = null;
        schedulerLogger.info("Scheduler sinkronisasi model AI dimatikan.");
      }
    },
    isRunning: () => activeInterval !== null,
  };
}
