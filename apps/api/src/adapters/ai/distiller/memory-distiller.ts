import { createModuleLogger } from '../../../logs';
import { chatWithFallback } from '../client/chat-fallback';
import { PromptEngine } from '../prompts/prompt-engine';

const aiLogger = createModuleLogger('ai-memory-distiller');

/**
 * Menganalisis riwayat pesan sebelumnya menggunakan model Free Tier nvidia/nemotron-3.5-lightning-free
 * untuk menghasilkan intisari konteks percakapan (Memory Digest).
 */
export async function distillConversationContext(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  latestMessage: string = '',
  modelOverride?: string
): Promise<string | null> {
  if (!history || history.length === 0) {
    return null;
  }

  const DISTILLER_MODEL = modelOverride || 'nvidia/nemotron-3.5-lightning-free';

  const formattedHistory = history
    .map((h) => `${h.role === 'user' ? 'Pelanggan' : 'Bot'}: ${h.content}`)
    .join('\n');

  const systemPrompt = PromptEngine.loadTemplate('memory-distiller.system.md');

  const userPrompt = `--- RIWAYAT PERCAKAPAN SEBELUMNYA (${history.length} pesan) ---
${formattedHistory}
--------------------------------------------------
PESAN TERKINI PENGGUNA: "${latestMessage}"

Tuliskan ringkasan konteks memori aktif:`;

  try {
    const result = await chatWithFallback({
      model: DISTILLER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      timeout_ms: 15000,
    });

    const cleaned = result.content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();

    return cleaned || null;
  } catch (err: any) {
    aiLogger.warn(`Gagal menjalankan distillConversationContext: ${err.message}. Lanjut tanpa memori digest.`);
    return null;
  }
}
