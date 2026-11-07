import { env } from '../../../config/env';
import { createModuleLogger } from '../../../logs';
import { AiCotCleaner } from '../sanitizer/ai-cot-cleaner';
import type { AiChatOptions, AiChatResult, AiUsageStats } from '../types';

const aiLogger = createModuleLogger('ai-gateway-client');

/**
 * Client untuk memanggil HTTP endpoint /chat/completions Vercel AI Gateway.
 */
export async function executeChatCompletion(
  options: AiChatOptions,
  config?: { baseUrl?: string; apiKey?: string; defaultModel?: string }
): Promise<AiChatResult> {
  const baseUrl = config?.baseUrl || env.AI_GATEWAY_URL;
  const apiKey = config?.apiKey || env.AI_PROVIDER_API_KEY;
  const model = options.model || config?.defaultModel || env.AI_DEFAULT_MODEL_FREE;
  const url = `${baseUrl}/chat/completions`;

  if (!apiKey) {
    throw new Error(
      'AI_PROVIDER_API_KEY belum disetel di .env. Pastikan API key Vercel telah dimasukkan.'
    );
  }

  const payload: Record<string, any> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.max_tokens) {
    payload.max_tokens = options.max_tokens;
  }

  if (options.response_format) {
    payload.response_format = options.response_format;
  }

  const timeoutMs = options.timeout_ms || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Gagal chat completion dengan model '${model}' (HTTP ${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as any;
    const choice = data.choices?.[0];
    let content = choice?.message?.content || '';
    if (!content && choice?.message?.reasoning) {
      const cleanedReasoning = AiCotCleaner.cleanThinkingArtifacts(choice.message.reasoning);
      if (!AiCotCleaner.isEnglishMonologue(cleanedReasoning)) {
        content = cleanedReasoning;
      }
    }
    const rawUsage = data.usage || {};

    const usage: AiUsageStats = {
      prompt_tokens: Number(rawUsage.prompt_tokens) || 0,
      completion_tokens: Number(rawUsage.completion_tokens) || 0,
      total_tokens: Number(rawUsage.total_tokens) || 0,
      cost: Number(rawUsage.cost) || 0,
    };

    aiLogger.info(`AI Response diterima dari model ${model}`, {
      action: 'chat_completion',
      model,
      totalTokens: usage.total_tokens,
      cost: usage.cost,
    });

    return {
      content,
      model,
      usage,
      finish_reason: choice?.finish_reason,
      raw: data,
    };
  } catch (err: any) {
    clearTimeout(timer);
    aiLogger.error(`Error pada chat completion model '${model}': ${err.message}`, err, {
      model,
    });
    throw err;
  }
}
