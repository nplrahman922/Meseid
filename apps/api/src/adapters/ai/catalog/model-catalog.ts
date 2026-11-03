import { env } from '../../../config/env';
import { createModuleLogger } from '../../../logs';
import type { AiModelInfo } from '../types';

const aiLogger = createModuleLogger('ai-model-catalog');

export class ModelCatalog {
  private baseUrl: string;
  private apiKey: string;
  private cachedModels: AiModelInfo[] | null = null;
  private cacheExpiresAt: number = 0;
  private cacheTtlMs: number = 10 * 60 * 1000; // 10 menit cache

  constructor() {
    this.baseUrl = env.AI_GATEWAY_URL;
    this.apiKey = env.AI_PROVIDER_API_KEY;
  }

  /**
   * Mengambil daftar seluruh model yang tersedia dari Vercel AI Gateway.
   * Dilengkapi caching in-memory 10 menit untuk efisiensi request.
   */
  async listModels(forceRefresh: boolean = false): Promise<AiModelInfo[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedModels && now < this.cacheExpiresAt) {
      return this.cachedModels;
    }

    try {
      const url = `${this.baseUrl}/models`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} saat fetch models: ${errorText}`);
      }

      const body = (await response.json()) as { data?: any[] };
      const rawList = body.data || [];

      const parsed: AiModelInfo[] = rawList.map((m: any) => {
        const inputPrice = String(m.pricing?.input ?? '');
        const outputPrice = String(m.pricing?.output ?? '');
        const tags = Array.isArray(m.tags) ? m.tags : [];
        const isFree =
          (inputPrice === '0' && outputPrice === '0') ||
          tags.includes('free') ||
          String(m.id || '').endsWith('-free');

        return {
          id: m.id,
          name: m.name || m.id,
          owned_by: m.owned_by || '',
          context_window: Number(m.context_window) || 0,
          max_tokens: Number(m.max_tokens) || 0,
          is_free: isFree,
          pricing: m.pricing
            ? { input: inputPrice, output: outputPrice }
            : undefined,
          modalities: m.modalities,
          tags,
          description: m.description,
        };
      });

      this.cachedModels = parsed;
      this.cacheExpiresAt = now + this.cacheTtlMs;

      aiLogger.info(`Berhasil memuat ${parsed.length} model dari Vercel AI Gateway`, {
        action: 'list_models',
        count: parsed.length,
      });

      return parsed;
    } catch (err: any) {
      aiLogger.error(`Gagal memuat list model AI: ${err.message}`, err);
      if (this.cachedModels) {
        return this.cachedModels;
      }
      throw err;
    }
  }

  /**
   * Mengambil daftar model dari Vercel AI Gateway dengan mekanisme exponential backoff retry.
   */
  async fetchModelsWithRetry(
    maxRetries: number = 3,
    baseDelayMs: number = 2000
  ): Promise<AiModelInfo[]> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.listModels(true);
      } catch (err: any) {
        lastError = err;
        aiLogger.warn(
          `Percobaan ${attempt}/${maxRetries} gagal mengambil model dari Vercel: ${err.message}`,
          { attempt, maxRetries }
        );
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError || new Error(`Gagal memuat model setelah ${maxRetries} percobaan`);
  }

  /**
   * Mengambil daftar model gratis yang mendukung chat completion.
   */
  async getFreeModels(forceRefresh: boolean = false): Promise<AiModelInfo[]> {
    const all = await this.listModels(forceRefresh);
    return all.filter(
      (m) =>
        m.is_free &&
        m.max_tokens > 0 &&
        !m.id.includes('laya') &&
        !m.id.includes('beam') &&
        !m.id.includes('glyph')
    );
  }

  /**
   * Mengambil metadata model spesifik berdasarkan ID.
   */
  async getModel(modelId: string): Promise<AiModelInfo | undefined> {
    const all = await this.listModels();
    return all.find((m) => m.id === modelId);
  }
}

export const modelCatalog = new ModelCatalog();
