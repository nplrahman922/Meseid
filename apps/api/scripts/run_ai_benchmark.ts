import { EvalRunner } from '../src/adapters/ai/eval/eval.runner';
import { ADMIN_EVAL_DATASET, ASSISTANT_EVAL_DATASET } from '../src/adapters/ai/eval/eval.dataset';
import type { ModelEvalSummary } from '../src/adapters/ai/eval/eval.types';

/**
 * Script Otomatis Benchmarking AI Meseid dengan Pemisahan Persona:
 * 1. AI Admin Toko (Customer-Facing): Strict KB, Tolak Non-Toko, Anti-Leak, Anti-Hallucination.
 * 2. AI Asisten Pemilik (Owner-Facing): Ekstraksi Akuntansi, Solutif Coding/Ide, Buka Rahasia Modal.
 */
async function runPersonaEvaluation(
  personaName: 'Admin Toko' | 'Asisten Pemilik',
  dataset: any[],
  candidateModels: string[]
) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 RAPOR EVALUASI AI: ${personaName.toUpperCase()}`);
  console.log('='.repeat(80));

  const summaries: ModelEvalSummary[] = [];

  for (const modelId of candidateModels) {
    console.log(`▶ Menguji [${personaName}] pada model: ${modelId}...`);
    try {
      const summary = await EvalRunner.evaluateModel(modelId, dataset, {
        onProgress: (current, total, testName) => {
          process.stdout.write(`  [${current}/${total}] ${testName}...\r`);
        },
      });
      summaries.push(summary);
      console.log(`\n✔ Selesai: Skor ${summary.overallScore}/100 | Lulus: ${summary.passedThreshold ? 'YA' : 'TIDAK'} | Latensi: ${summary.averageLatencyMs}ms`);
    } catch (err: any) {
      console.error(`\n✖ Gagal mengevaluasi ${modelId}:`, err.message);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`REKAPITULASI RAPOR ${personaName.toUpperCase()}`);
  console.log(
    'Model'.padEnd(35) +
    'Tier'.padEnd(8) +
    'Score'.padEnd(8) +
    'Status'.padEnd(10) +
    'Schema'.padEnd(8) +
    'KB/Tx'.padEnd(7) +
    'AntiH'.padEnd(7) +
    'Sec'.padEnd(6) +
    'Lat(ms)'
  );
  console.log('-'.repeat(96));

  for (const s of summaries) {
    const status = s.passedThreshold ? 'PASSED' : 'FAILED';
    console.log(
      s.modelId.padEnd(35) +
      s.tier.toUpperCase().padEnd(8) +
      `${s.overallScore}`.padEnd(8) +
      status.padEnd(10) +
      `${s.metricAverages.schema_validity}%`.padEnd(8) +
      `${s.metricAverages.kb_groundedness}%`.padEnd(7) +
      `${s.metricAverages.anti_hallucination}%`.padEnd(7) +
      `${s.metricAverages.security_defense}%`.padEnd(6) +
      `${s.averageLatencyMs}`
    );
  }
  console.log('='.repeat(80));
  return summaries;
}

async function main() {
  const args = process.argv.slice(2);
  const targetModelArg = args.find((a) => a.startsWith('--model='))?.split('=')[1];
  const personaArg = args.find((a) => a.startsWith('--persona='))?.split('=')[1] || 'all';

  const candidateModels = targetModelArg
    ? [targetModelArg]
    : ['google/gemini-2.5-flash', 'openai/gpt-4o-mini'];

  if (personaArg === 'admin' || personaArg === 'all') {
    await runPersonaEvaluation('Admin Toko', ADMIN_EVAL_DATASET, candidateModels);
  }

  if (personaArg === 'assistant' || personaArg === 'all') {
    await runPersonaEvaluation('Asisten Pemilik', ASSISTANT_EVAL_DATASET, candidateModels);
  }
}

main().catch(console.error);
