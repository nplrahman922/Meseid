import { createModuleLogger } from '../../../logs';
import { modelCatalog } from './model-catalog';
import type { SyncModelsOptions, SyncAiModelsResult, ParsedAiModelRecord } from '../types';

const aiLogger = createModuleLogger('ai-model-sync');

/**
 * Operasi sinkronisasi model dari Vercel AI Gateway ke format basis data PostgreSQL.
 */
export async function syncModelsWithVercel(options?: SyncModelsOptions): Promise<SyncAiModelsResult> {
  const startTime = Date.now();
  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelayMs ?? 2000;

  try {
    const rawModels = await modelCatalog.fetchModelsWithRetry(maxRetries, retryDelay);
    const USD_TO_IDR = 16000;

    const parsedModels: ParsedAiModelRecord[] = [];
    let totalFree = 0;
    let totalPro = 0;

    for (const m of rawModels) {
      if (!m.id || typeof m.id !== 'string') continue;

      const isFree = Boolean(m.is_free);
      if (isFree) totalFree++;
      else totalPro++;

      const usdInputPerToken = parseFloat(m.pricing?.input || '0') || 0;
      const usdOutputPerToken = parseFloat(m.pricing?.output || '0') || 0;

      const priceInputPer1m = Math.round(usdInputPerToken * 1_000_000 * USD_TO_IDR * 10000) / 10000;
      const priceOutputPer1m = Math.round(usdOutputPerToken * 1_000_000 * USD_TO_IDR * 10000) / 10000;

      parsedModels.push({
        provider: m.owned_by || m.id.split('/')[0] || 'custom',
        model_id: m.id,
        tier: isFree ? 'free' : 'pro',
        currency: 'IDR',
        enabled: true,
        price_input_per_1m: priceInputPer1m,
        price_output_per_1m: priceOutputPer1m,
        name: m.name,
        context_window: m.context_window,
      });
    }

    const durationMs = Date.now() - startTime;
    aiLogger.info(`Berhasil memetakan ${parsedModels.length} model untuk sinkronisasi DB`, {
      total: parsedModels.length,
      free: totalFree,
      pro: totalPro,
      durationMs,
    });

    return {
      success: true,
      total_fetched: rawModels.length,
      total_synced: parsedModels.length,
      total_free: totalFree,
      total_pro: totalPro,
      models: parsedModels,
      duration_ms: durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    aiLogger.error(`Gagal melakukan sinkronisasi model Vercel: ${err.message}`, err);
    return {
      success: false,
      total_fetched: 0,
      total_synced: 0,
      total_free: 0,
      total_pro: 0,
      models: [],
      duration_ms: durationMs,
      error: err.message,
    };
  }
}
