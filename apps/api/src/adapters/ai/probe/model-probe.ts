import { env } from '../../../config/env';
import { executeChatCompletion } from '../client/gateway-client';
import type { AiTestResult } from '../types';

/**
 * Melakukan probe health check cepat (1 token) terhadap model tertentu.
 */
export async function probeModelHealth(
  modelId: string,
  timeoutMs: number = 5000
): Promise<{ healthy: boolean; latency_ms: number; error?: string }> {
  const startTime = Date.now();
  try {
    await executeChatCompletion({
      model: modelId,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      timeout_ms: timeoutMs,
    });
    return {
      healthy: true,
      latency_ms: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      healthy: false,
      latency_ms: Date.now() - startTime,
      error: err.message || 'Model probe failed',
    };
  }
}

/**
 * Menjalankan pengujian cepat terhadap model gratis yang terdaftar.
 */
export async function testFreeModel(
  customPrompt: string = 'Halo, sebutkan namamu dan perkenalkan kemampuanmu secara singkat dalam 1-2 kalimat.',
  customModel?: string
): Promise<AiTestResult> {
  const model = customModel || env.AI_DEFAULT_MODEL_FREE;
  const startTime = Date.now();

  try {
    const result = await executeChatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah asisten AI toko dan akuntansi cerdas untuk UMKM Indonesia.',
        },
        {
          role: 'user',
          content: customPrompt,
        },
      ],
      temperature: 0.5,
      timeout_ms: 8000,
    });

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      model: result.model,
      prompt: customPrompt,
      reply: result.content,
      usage: result.usage,
      latency_ms: latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      model,
      prompt: customPrompt,
      reply: '',
      latency_ms: latencyMs,
      error: err.message,
    };
  }
}
