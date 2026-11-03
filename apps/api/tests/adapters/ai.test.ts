import { describe, it, expect } from 'bun:test';
import { aiAdapter } from '../../src/adapters/ai';

describe('AI Adapter Suite (Vercel AI Gateway)', () => {
  it('berhasil memuat daftar seluruh model dan token context window', async () => {
    const models = await aiAdapter.listModels();
    expect(models.length).toBeGreaterThan(50);

    const first = models[0];
    expect(first.id).toBeDefined();
    expect(typeof first.context_window).toBe('number');
    expect(first.context_window).toBeGreaterThan(0);
  });

  it('berhasil memfilter daftar model gratis (zero pricing / tag free)', async () => {
    const freeModels = await aiAdapter.getFreeModels();
    expect(freeModels.length).toBeGreaterThan(0);

    for (const m of freeModels) {
      expect(m.is_free).toBe(true);
      expect(m.context_window).toBeGreaterThan(0);
    }
  });

  it('berhasil melakukan chat completion / test terhadap model gratis', async () => {
    const testResult = await aiAdapter.testFreeModel(
      'Sebutkan 3 tips keuangan singkat untuk warung makan UMKM.'
    );

    expect(testResult.success).toBe(true);
    expect(testResult.model).toBeDefined();
    expect(testResult.reply.length).toBeGreaterThan(20);
    expect(testResult.usage).toBeDefined();
    expect(testResult.usage!.total_tokens).toBeGreaterThan(0);
    expect(testResult.latency_ms).toBeGreaterThan(0);
  }, 30000); // Timeout 30s untuk response AI
});
