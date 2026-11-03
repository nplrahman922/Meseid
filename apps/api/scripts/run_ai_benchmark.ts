import { EvalRunner } from '../src/adapters/ai/eval/eval.runner';
import { modelProfilesRegistry } from '../src/adapters/ai/eval/model-profiles.registry';
import type { ModelEvalSummary } from '../src/adapters/ai/eval/eval.types';

/**
 * Script Otomatis Benchmarking & Validasi Matriks Evaluasi AI Meseid.
 * Menguji model AI terhadap golden dataset Warung Bu Rina untuk mengukur
 * skor empiris schema, KB groundedness, anti-halusinasi, dan keamanan.
 */
async function main() {
  console.log('='.repeat(70));
  console.log('🚀 MEMULAI STANDARISASI & BENCHMARK AI MESEID (VERCEL GATEWAY)');
  console.log('='.repeat(70));

  const args = process.argv.slice(2);
  const targetModelArg = args.find((a) => a.startsWith('--model='))?.split('=')[1];

  let candidateModels: string[] = [];

  if (targetModelArg) {
    candidateModels = [targetModelArg];
  } else {
    // Jalankan 1 model pro unggulan dan 1 model gratis utama untuk evaluasi representatif
    candidateModels = [
      'google/gemini-2.5-flash',
      'openai/gpt-4o-mini',
      'nvidia/nemotron-3.5-lightning-free',
    ];
  }

  const summaries: ModelEvalSummary[] = [];

  for (const modelId of candidateModels) {
    console.log(`\n▶ Sedang mengevaluasi model: ${modelId}...`);
    try {
      const summary = await EvalRunner.evaluateModel(modelId, undefined, {
        onProgress: (current, total, testName) => {
          process.stdout.write(`  [${current}/${total}] ${testName}...\r`);
        },
      });
      summaries.push(summary);
      console.log(`\n✔ Selesai: Skor ${summary.overallScore}/100 | Lulus: ${summary.passedThreshold ? 'YA' : 'TIDAK'} | Latensi Rata-rata: ${summary.averageLatencyMs}ms`);
    } catch (err: any) {
      console.error(`\n✖ Gagal mengevaluasi ${modelId}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 REKAPITULASI HASIL EVALUASI MODEL AI (TAHAP 1)');
  console.log('='.repeat(70));
  console.log(
    'Model'.padEnd(35) +
    'Tier'.padEnd(8) +
    'Score'.padEnd(8) +
    'Status'.padEnd(10) +
    'Schema'.padEnd(8) +
    'KB'.padEnd(6) +
    'AntiH'.padEnd(7) +
    'Sec'.padEnd(6) +
    'Lat(ms)'
  );
  console.log('-'.repeat(95));

  for (const s of summaries) {
    const status = s.passedThreshold ? 'PASSED' : 'FAILED';
    console.log(
      s.modelId.padEnd(35) +
      s.tier.toUpperCase().padEnd(8) +
      `${s.overallScore}`.padEnd(8) +
      status.padEnd(10) +
      `${s.metricAverages.schema_validity}%`.padEnd(8) +
      `${s.metricAverages.kb_groundedness}%`.padEnd(6) +
      `${s.metricAverages.anti_hallucination}%`.padEnd(7) +
      `${s.metricAverages.security_defense}%`.padEnd(6) +
      `${s.averageLatencyMs}`
    );
  }
  console.log('='.repeat(70));
}

main().catch(console.error);
