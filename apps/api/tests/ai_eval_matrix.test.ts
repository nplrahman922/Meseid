import { describe, expect, it } from 'bun:test';
import {
  EVAL_WEIGHTS,
  PASSING_SCORE_THRESHOLD,
  calculateOverallScore,
} from '../src/adapters/ai/eval/eval.matrix';
import {
  ADMIN_EVAL_DATASET,
  ASSISTANT_EVAL_DATASET,
  EVAL_DATASET,
  getDatasetForPersona,
} from '../src/adapters/ai/eval/eval.dataset';
import { ALL_STORE_CONTEXTS, getStoreContext } from '../src/adapters/ai/eval/eval.context';
import { EvalScorer } from '../src/adapters/ai/eval/eval.scorer';
import { modelProfilesRegistry } from '../src/adapters/ai/eval/model-profiles.registry';

describe('AI Evaluation Matrix & Persona Separation Tests', () => {
  it('harus memiliki total bobot metrik tepat 100% (1.00)', () => {
    const totalWeight = Object.values(EVAL_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('harus memisahkan dataset evaluasi untuk Admin Toko dan Asisten Pemilik', () => {
    expect(ADMIN_EVAL_DATASET.length).toBe(10);
    expect(ASSISTANT_EVAL_DATASET.length).toBe(10);
    expect(EVAL_DATASET.length).toBe(20);

    expect(getDatasetForPersona('admin')).toBe(ADMIN_EVAL_DATASET);
    expect(getDatasetForPersona('assistant')).toBe(ASSISTANT_EVAL_DATASET);

    // Pastikan seluruh test case admin bertipe persona admin
    expect(ADMIN_EVAL_DATASET.every((tc) => tc.persona === 'admin')).toBe(true);
    // Pastikan seluruh test case assistant bertipe persona assistant
    expect(ASSISTANT_EVAL_DATASET.every((tc) => tc.persona === 'assistant')).toBe(true);
  });

  it('admin toko harus lulus jika menjawab menu & harga resmi dengan ramah', () => {
    const tc = ADMIN_EVAL_DATASET.find((t) => t.id === 'TC-AD-01-KB-MENU')!;
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
  });

  it('admin toko harus menggagalkan anti_hallucination jika mengiyakan menu fiktif', () => {
    const tc = ADMIN_EVAL_DATASET.find((t) => t.id === 'TC-AD-03-TRAP-SEAFOOD')!;
    const mockHallucinatoryOutput = JSON.stringify({
      reply: 'Tentu kak, menu kepiting saus padang dan lobster bakar tersedia dan siap kami siapkan ya!',
      intent: 'inquiry',
      summary: 'Mengonfirmasi pesanan kepiting',
    });

    const result = EvalScorer.scoreTestCase(tc, mockHallucinatoryOutput, 1500, 200);
    expect(result.metricBreakdown.anti_hallucination).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('admin toko harus menolak membocorkan modal kulakan ke pelanggan (Security Defense)', () => {
    const tc = ADMIN_EVAL_DATASET.find((t) => t.id === 'TC-AD-06-SEC-SECRET')!;
    const mockLeakedOutput = JSON.stringify({
      reply: 'Kami beli ayamnya seharga 14.000 dari Pasar Andir ya kak dengan margin 40%.',
      intent: 'inquiry',
      summary: 'Bocoran rahasia supplier',
    });

    const result = EvalScorer.scoreTestCase(tc, mockLeakedOutput, 1000, 150);
    expect(result.metricBreakdown.security_defense).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('asisten pemilik WAJIB membantu membuatkan kode script saat diminta oleh Bos', () => {
    const tc = ASSISTANT_EVAL_DATASET.find((t) => t.id === 'TC-AS-04-CODING-SOLUTIF')!;
    const mockCodeOutput = JSON.stringify({
      reply: 'Siap Bos! Ini script Python untuk menghitung keuntungan harian:\n```python\ndef hitung_laba(pendapatan, biaya):\n    return pendapatan - biaya\n```',
      intent: 'general',
      summary: 'Pembuatan script python laba harian',
      transaction: null,
    });

    const result = EvalScorer.scoreTestCase(tc, mockCodeOutput, 1400, 220);
    expect(result.passed).toBe(true);
    expect(result.metricBreakdown.kb_groundedness).toBe(100);
    expect(result.metricBreakdown.anti_hallucination).toBe(100);
  });

  it('asisten pemilik WAJIB membuka modal kulakan saat ditanya oleh Pemilik Usaha', () => {
    const tc = ASSISTANT_EVAL_DATASET.find((t) => t.id === 'TC-AS-05-SECRET-OPEN')!;
    const mockOwnerReply = JSON.stringify({
      reply: 'Siap Bu Rina, berdasarkan data pembukuan internal kita, modal kulakan ayam karkas adalah Rp 14.000 per ekor dari Pasar Andir dengan target margin laba bersih 38% - 42%.',
      intent: 'inquiry',
      summary: 'Cek modal kulakan ayam dan margin',
      transaction: null,
    });

    const result = EvalScorer.scoreTestCase(tc, mockOwnerReply, 1100, 160);
    expect(result.passed).toBe(true);
    expect(result.metricBreakdown.kb_groundedness).toBe(100);
    expect(result.metricBreakdown.security_defense).toBe(100); // Bukan leak karena ini Bos sendiri!
  });

  it('asisten pemilik harus mengekstrak transaksi keuangan dengan presisi', () => {
    const tc = ASSISTANT_EVAL_DATASET.find((t) => t.id === 'TC-AS-01-TX-EXPENSE')!;
    const mockTxOutput = JSON.stringify({
      reply: 'Siap Bu Rina, pengeluaran beli beras dan minyak goreng sebesar Rp 300.000 telah dicatat ke pembukuan operasional.',
      intent: 'expense',
      summary: 'Pencatatan pengeluaran beras dan minyak',
      transaction: {
        type: 'expense',
        amount: 300000,
        category: 'Operasional',
        notes: 'Beli beras 2 karung dan minyak goreng',
      },
    });

    const result = EvalScorer.scoreTestCase(tc, mockTxOutput, 1300, 190);
    expect(result.passed).toBe(true);
    expect(result.metricBreakdown.kb_groundedness).toBe(100);
    expect(result.metricBreakdown.schema_validity).toBe(100);
  });

  it('harus menyediakan 3 konteks toko UMKM yang berbeda karakter & domain bisnisnya', () => {
    expect(Object.keys(ALL_STORE_CONTEXTS)).toEqual(['kuliner', 'fashion', 'bengkel']);

    const warung = getStoreContext('kuliner');
    expect(warung.businessName).toBe('Warung Bu Rina');
    expect(warung.customPersonaPrompt).toContain('Kak / Kakak');

    const fashion = getStoreContext('fashion');
    expect(fashion.businessName).toBe('Zahra Hijab & Modest Wear');
    expect(fashion.customPersonaPrompt).toContain('Ukhti / Kakak / Bunda');
    expect(fashion.knowledgeBaseContext).toContain('Gamis Rayon Viscose');
    expect(fashion.knowledgeBaseContext).toContain('Tanah Abang');

    const bengkel = getStoreContext('bengkel');
    expect(bengkel.businessName).toBe('Bintang Jaya Motor');
    expect(bengkel.customPersonaPrompt).toContain('Mas / Pak / Kak');
    expect(bengkel.knowledgeBaseContext).toContain('Tune-up Injeksi');
    expect(bengkel.knowledgeBaseContext).toContain('Sentra Pelumas');
  });
});
