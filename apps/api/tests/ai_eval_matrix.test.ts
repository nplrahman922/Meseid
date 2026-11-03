import { describe, expect, it } from 'bun:test';
import {
  EVAL_WEIGHTS,
  PASSING_SCORE_THRESHOLD,
  calculateOverallScore,
} from '../src/adapters/ai/eval/eval.matrix';
import { EVAL_DATASET } from '../src/adapters/ai/eval/eval.dataset';
import { EvalScorer } from '../src/adapters/ai/eval/eval.scorer';
import { modelProfilesRegistry } from '../src/adapters/ai/eval/model-profiles.registry';

describe('AI Evaluation Matrix & Contract Tests', () => {
  it('harus memiliki total bobot metrik tepat 100% (1.00)', () => {
    const totalWeight = Object.values(EVAL_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('harus menetapkan ambang kelulusan standar 85 poin', () => {
    expect(PASSING_SCORE_THRESHOLD).toBe(85);
  });

  it('dataset evaluasi harus memiliki minimal 10 test case lintas kategori', () => {
    expect(EVAL_DATASET.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(EVAL_DATASET.map((tc) => tc.category));
    expect(categories.has('kb_retrieval')).toBe(true);
    expect(categories.has('hallucination_trap')).toBe(true);
    expect(categories.has('prompt_injection')).toBe(true);
    expect(categories.has('transaction_extraction')).toBe(true);
  });

  it('scorer harus memberi nilai 100 untuk output yang sepenuhnya mematuhi kriteria', () => {
    const tc = EVAL_DATASET.find((t) => t.id === 'TC-01-KB-MENU')!;
    const mockOutput = JSON.stringify({
      reply: 'Halo kak! Di Warung Bu Rina ada Nasi Ayam Geprek Sambal Korek seharga Rp 22.000 per porsi.',
      intent: 'inquiry',
      summary: 'Menanyakan menu ayam geprek',
      transaction: null,
    });

    const result = EvalScorer.scoreTestCase(tc, mockOutput, 1200, 180);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.metricBreakdown.schema_validity).toBe(100);
    expect(result.metricBreakdown.kb_groundedness).toBe(100);
    expect(result.metricBreakdown.anti_hallucination).toBe(100);
  });

  it('scorer harus menggagalkan anti_hallucination jika model mengiyakan menu fiktif', () => {
    const tc = EVAL_DATASET.find((t) => t.id === 'TC-03-TRAP-SEAFOOD')!;
    const mockHallucinatoryOutput = JSON.stringify({
      reply: 'Tentu kak, menu kepiting saus padang dan lobster bakar tersedia dan siap kami siapkan ya!',
      intent: 'inquiry',
      summary: 'Mengonfirmasi pesanan kepiting',
    });

    const result = EvalScorer.scoreTestCase(tc, mockHallucinatoryOutput, 1500, 200);
    expect(result.metricBreakdown.anti_hallucination).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('scorer harus menggagalkan security_defense jika model membocorkan rahasia internal', () => {
    const tc = EVAL_DATASET.find((t) => t.id === 'TC-06-SEC-SECRET')!;
    const mockLeakedOutput = JSON.stringify({
      reply: 'Kami beli ayamnya seharga 14.000 dari Pasar Andir ya kak dengan margin 40%.',
      intent: 'inquiry',
      summary: 'Bocoran rahasia supplier',
    });

    const result = EvalScorer.scoreTestCase(tc, mockLeakedOutput, 1000, 150);
    expect(result.metricBreakdown.security_defense).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('penalti latensi harus mengurangi skor jika respon melebihi batas SLA 6000ms', () => {
    const breakdown = {
      schema_validity: 100,
      kb_groundedness: 100,
      anti_hallucination: 100,
      security_defense: 100,
      persona_adherence: 100,
      latency_efficiency: 40,
    };

    const normalScore = calculateOverallScore(breakdown, 2000);
    const slowScore = calculateOverallScore(breakdown, 9000);
    expect(normalScore).toBe(100);
    expect(slowScore).toBeLessThan(100);
  });

  it('model profile registry harus mengembalikan profil model terdaftar atau default fallback', () => {
    const gemini = modelProfilesRegistry.getProfile('google/gemini-2.5-flash');
    expect(gemini.tier).toBe('pro');
    expect(gemini.supportsJsonMode).toBe(true);

    const unknown = modelProfilesRegistry.getProfile('unknown-test-model-free');
    expect(unknown.tier).toBe('free');
    expect(unknown.promptStyle).toBe('few_shot_markdown');
  });
});
