import { env } from '../../../config/env';
import { createModuleLogger } from '../../../logs';
import { modelCatalog } from '../catalog/model-catalog';
import { executeChatCompletion } from './gateway-client';
import type { AiChatOptions, AiChatResult } from '../types';

const aiLogger = createModuleLogger('ai-chat-fallback');

/**
 * Mengirim chat prompt dengan mekanisme retry & fallback berantai:
 * - Maksimal 2 percobaan (1 model utama + 1 model cadangan).
 * - Timeout teralokasi per panggilan.
 * - Fallback dipicu oleh: HTTP error, timeout, atau jaringan.
 */
export async function chatWithFallback(
  options: AiChatOptions,
  preferredFallbackModels?: string[]
): Promise<AiChatResult> {
  const primaryModel = options.model || env.AI_DEFAULT_MODEL_FREE;

  let candidateFallbacks: string[] = [];

  if (preferredFallbackModels && preferredFallbackModels.length > 0) {
    candidateFallbacks = preferredFallbackModels;
  } else if (env.AI_FALLBACK_MODELS_FREE && env.AI_FALLBACK_MODELS_FREE.length > 0) {
    candidateFallbacks = env.AI_FALLBACK_MODELS_FREE;
  } else {
    try {
      const freeModels = await modelCatalog.getFreeModels();
      candidateFallbacks = freeModels.map((m) => m.id);
    } catch {
      candidateFallbacks = [
        'minimax/minimax-m3.1-flash',
        'poolside/laguna-s-2.1-free',
        'reflection/beam-free',
      ];
    }
  }

  candidateFallbacks = candidateFallbacks.filter((m) => m !== primaryModel);
  const fallbackModel = candidateFallbacks[0] || 'nvidia/nemotron-3.5-lightning-free';
  const modelsToTry = [primaryModel, fallbackModel];
  const timeoutAttempt1 = options.timeout_ms || 18000;
  const timeoutAttempt2 = Math.max(options.timeout_ms || 18000, 20000);

  let lastError: any = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const currentModel = modelsToTry[attempt];
    const currentTimeout = attempt === 0 ? timeoutAttempt1 : timeoutAttempt2;
    try {
      aiLogger.info(
        `Mencoba memanggil model AI (percobaan ${attempt + 1}/${modelsToTry.length}): ${currentModel} (timeout: ${currentTimeout}ms)`
      );

      const result = await executeChatCompletion({
        ...options,
        model: currentModel,
        timeout_ms: currentTimeout,
      });

      result.attempts = attempt + 1;
      return result;
    } catch (err: any) {
      lastError = err;
      aiLogger.warn(
        `Percobaan ke-${attempt + 1} dengan model '${currentModel}' gagal: ${err.message}. ${
          attempt < modelsToTry.length - 1
            ? 'Mencoba model fallback berikutnya...'
            : 'Seluruh percobaan model AI gagal.'
        }`
      );
    }
  }

  throw new Error(
    `Seluruh percobaan model AI gagal (2 percobaan). Kesalahan terakhir: ${lastError?.message}`
  );
}
