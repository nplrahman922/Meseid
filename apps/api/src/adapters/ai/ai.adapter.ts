import { modelCatalog } from './catalog/model-catalog';
import { syncModelsWithVercel as syncModelsFn } from './catalog/model-sync';
import { executeChatCompletion } from './client/gateway-client';
import { chatWithFallback as chatFallbackFn } from './client/chat-fallback';
import { distillConversationContext as distillFn } from './distiller/memory-distiller';
import { extractChatResponse as extractFn } from './extractor/chat-extractor';
import { probeModelHealth as probeFn, testFreeModel as testModelFn } from './probe/model-probe';
import { JsonParser } from './parser/json-parser';
import { ChatStylerFormatter } from './formatter/chat-styler.formatter';
import { EvalRunner } from './eval/eval.runner';
import { modelProfilesRegistry } from './eval/model-profiles.registry';
import type {
  AiChatOptions,
  AiChatResult,
  AiExtractionResult,
  AiModelInfo,
  AiTestResult,
  BusinessContext,
  SyncAiModelsResult,
  SyncModelsOptions,
} from './types';
import type { EvalTestCase, ModelEvalSummary, ModelProfile } from './eval/eval.types';

/**
 * AiAdapter Facade:
 * Menyatukan seluruh sub-modul AI (katalog, client, fallback, extractor, distiller, parser)
 * ke dalam interface terpadu dengan panjang berkas < 80 baris.
 */
export class AiAdapter {
  listModels(forceRefresh?: boolean): Promise<AiModelInfo[]> {
    return modelCatalog.listModels(forceRefresh);
  }

  fetchModelsWithRetry(maxRetries?: number, baseDelayMs?: number): Promise<AiModelInfo[]> {
    return modelCatalog.fetchModelsWithRetry(maxRetries, baseDelayMs);
  }

  getFreeModels(forceRefresh?: boolean): Promise<AiModelInfo[]> {
    return modelCatalog.getFreeModels(forceRefresh);
  }

  getModel(modelId: string): Promise<AiModelInfo | undefined> {
    return modelCatalog.getModel(modelId);
  }

  syncModelsWithVercel(options?: SyncModelsOptions): Promise<SyncAiModelsResult> {
    return syncModelsFn(options);
  }

  chat(options: AiChatOptions): Promise<AiChatResult> {
    return executeChatCompletion(options);
  }

  chatWithFallback(options: AiChatOptions, preferredFallbackModels?: string[]): Promise<AiChatResult> {
    return chatFallbackFn(options, preferredFallbackModels);
  }

  distillConversationContext(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    latestMessage?: string
  ): Promise<string | null> {
    return distillFn(history, latestMessage);
  }

  extractChatResponse(
    userText: string,
    persona: 'assistant' | 'admin',
    businessContext?: BusinessContext,
    model?: string,
    runtimeOptions?: {
      temperature?: number;
      maxTokens?: number;
      attachments?: any[];
    }
  ): Promise<AiExtractionResult> {
    return extractFn(userText, persona, businessContext, model, runtimeOptions);
  }

  probeModelHealth(modelId: string, timeoutMs?: number) {
    return probeFn(modelId, timeoutMs);
  }

  testFreeModel(customPrompt?: string, customModel?: string): Promise<AiTestResult> {
    return testModelFn(customPrompt, customModel);
  }

  sanitizeRawAiReply(rawContent: string): string {
    return JsonParser.sanitizeRawAiReply(rawContent);
  }

  parseFirstValidJsonObject(text: string): any | null {
    return JsonParser.parseFirstValidJsonObject(text);
  }

  styleChatReply(reply: string, channel?: 'whatsapp' | 'telegram'): string {
    return ChatStylerFormatter.format(reply, channel);
  }

  evaluateModel(
    modelId: string,
    customDataset?: EvalTestCase[],
    options?: { onProgress?: (current: number, total: number, testName: string) => void }
  ): Promise<ModelEvalSummary> {
    return EvalRunner.evaluateModel(modelId, customDataset, options);
  }

  getModelProfile(modelId: string): ModelProfile {
    return modelProfilesRegistry.getProfile(modelId);
  }
}

export const aiAdapter = new AiAdapter();
