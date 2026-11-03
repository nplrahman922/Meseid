import { createModuleLogger } from '../../../logs';
import { chatWithFallback } from '../client/chat-fallback';
import { JsonParser } from '../parser/json-parser';
import { PersonaPromptBuilder } from '../prompt/persona-prompt.builder';
import { ChatStylerFormatter } from '../formatter/chat-styler.formatter';
import { modelProfilesRegistry } from '../eval/model-profiles.registry';
import type { AiExtractionResult, AiTransactionItem, BusinessContext } from '../types';

const aiLogger = createModuleLogger('ai-chat-extractor');

/**
 * Mengirim pesan user ke model AI dan mengekstrak balasan ramah, intent, sentimen, ringkasan,
 * serta transaksi keuangan dalam satu pemanggilan terstruktur (Single Turn JSON).
 */
export async function extractChatResponse(
  userText: string,
  persona: 'assistant' | 'admin',
  businessContext?: BusinessContext,
  model?: string
): Promise<AiExtractionResult> {
  const startTime = Date.now();
  const profile = modelProfilesRegistry.getProfile(model || 'google/gemini-2.5-flash');
  const systemPrompt = PersonaPromptBuilder.buildSystemPrompt(persona, businessContext, profile);

  try {
    const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (businessContext?.recentTurns && Array.isArray(businessContext.recentTurns) && businessContext.recentTurns.length > 0) {
      for (const turn of businessContext.recentTurns) {
        if (turn && turn.content && typeof turn.content === 'string' && turn.content.trim()) {
          conversationMessages.push({
            role: turn.role === 'assistant' ? 'assistant' : 'user',
            content: turn.content.trim(),
          });
        }
      }
    }

    conversationMessages.push({ role: 'user', content: userText });

    const chatRes = await chatWithFallback({
      model: profile.modelId,
      messages: conversationMessages,
      temperature: profile.temperature,
      max_tokens: profile.maxTokens,
      timeout_ms: 25000,
    });

    const latencyMs = Date.now() - startTime;
    const rawContent = chatRes.content.trim();

    let cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    }

    let parsed = JsonParser.parseFirstValidJsonObject(cleaned) || JsonParser.parseFirstValidJsonObject(rawContent);

    const hasValidReply =
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.reply === 'string' &&
      parsed.reply.trim().length > 3 &&
      parsed.reply.trim() !== '...' &&
      !parsed.reply.includes('Tulis balasan langsung');

    if (!hasValidReply) {
      aiLogger.warn(`Gagal validasi skema JSON AI, fallback ke ekstraksi teks bersih`, {
        rawContent: rawContent.slice(0, 200),
      });
      const sanitizedFallback = JsonParser.sanitizeRawAiReply(rawContent);
      return {
        reply: ChatStylerFormatter.format(sanitizedFallback),
        intent: 'general',
        sentiment: 'neutral',
        summary: 'Percakapan pengguna',
        transaction: null,
        transactions: [],
        model_used: chatRes.model,
        attempts: chatRes.attempts || 1,
        latency_ms: latencyMs,
        schema_valid: false,
      };
    }

    let transactionItems: AiTransactionItem[] = [];
    if (Array.isArray(parsed.transactions)) {
      for (const item of parsed.transactions) {
        if (
          item &&
          typeof item === 'object' &&
          ['expense', 'income'].includes(item.type) &&
          typeof item.amount === 'number' &&
          item.amount > 0
        ) {
          transactionItems.push({
            type: item.type,
            amount: Math.round(item.amount),
            category: String(item.category || 'Lain-lain'),
            notes: String(item.notes || userText),
          });
        }
      }
    }

    let singleTransaction: AiTransactionItem | null = null;
    if (
      parsed.transaction &&
      typeof parsed.transaction === 'object' &&
      ['expense', 'income'].includes(parsed.transaction.type) &&
      typeof parsed.transaction.amount === 'number' &&
      parsed.transaction.amount > 0
    ) {
      singleTransaction = {
        type: parsed.transaction.type,
        amount: Math.round(parsed.transaction.amount),
        category: String(parsed.transaction.category || 'Lain-lain'),
        notes: String(parsed.transaction.notes || userText),
      };
    }

    if (transactionItems.length === 0 && singleTransaction) {
      transactionItems.push(singleTransaction);
    } else if (transactionItems.length > 0 && !singleTransaction) {
      singleTransaction = transactionItems[0];
    }

    const validIntents = ['expense', 'income', 'inquiry', 'general'];
    const resolvedIntent = (parsed && validIntents.includes(parsed.intent)) ? parsed.intent : 'general';
    const validSentiments = ['positive', 'neutral', 'negative'];
    const resolvedSentiment = (parsed && validSentiments.includes(parsed.sentiment)) ? parsed.sentiment : 'neutral';
    const resolvedSummary = (parsed && typeof parsed.summary === 'string') ? parsed.summary : 'Percakapan pengguna';

    return {
      reply: ChatStylerFormatter.format(JsonParser.sanitizeRawAiReply(String(parsed.reply))),
      intent: resolvedIntent as any,
      sentiment: resolvedSentiment as any,
      summary: resolvedSummary,
      transaction: singleTransaction,
      transactions: transactionItems,
      model_used: chatRes.model,
      attempts: chatRes.attempts || 1,
      latency_ms: latencyMs,
      schema_valid: true,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    throw new Error(`AI extraction error: ${err.message} (${latencyMs}ms)`);
  }
}
