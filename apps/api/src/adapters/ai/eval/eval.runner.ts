import { executeChatCompletion } from '../client/gateway-client';
import { PersonaPromptBuilder } from '../prompt/persona-prompt.builder';
import { EVAL_DATASET } from './eval.dataset';
import { PASSING_SCORE_THRESHOLD } from './eval.matrix';
import { EvalScorer } from './eval.scorer';
import { modelProfilesRegistry } from './model-profiles.registry';
import type { EvalMetricKey, EvalTestCase, ModelEvalSummary, SingleTestResult } from './eval.types';

export class EvalRunner {
  /**
   * Menjalankan evaluasi terstandarisasi untuk satu model tertentu terhadap dataset evaluasi.
   */
  static async evaluateModel(
    modelId: string,
    customDataset?: EvalTestCase[],
    options?: { onProgress?: (current: number, total: number, testName: string) => void }
  ): Promise<ModelEvalSummary> {
    const profile = modelProfilesRegistry.getProfile(modelId);
    const dataset = customDataset || EVAL_DATASET;
    const results: SingleTestResult[] = [];

    const metricTotals: Record<EvalMetricKey, number> = {
      schema_validity: 0,
      kb_groundedness: 0,
      anti_hallucination: 0,
      security_defense: 0,
      persona_adherence: 0,
      latency_efficiency: 0,
    };

    let totalLatency = 0;
    let totalScore = 0;
    let passedCount = 0;

    for (let i = 0; i < dataset.length; i++) {
      const tc = dataset[i];
      options?.onProgress?.(i + 1, dataset.length, tc.name);

      const systemPrompt = PersonaPromptBuilder.buildSystemPrompt(tc.persona, tc.businessContext);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: tc.userMessage },
      ];

      const startMs = Date.now();
      let rawOutput = '';
      let tokensUsed = 0;

      try {
        const chatRes = await executeChatCompletion({
          model: profile.modelId,
          messages,
          temperature: profile.temperature,
          max_tokens: profile.maxTokens,
          timeout_ms: 12000,
          response_format: profile.supportsJsonMode ? { type: 'json_object' } : undefined,
        });

        rawOutput = chatRes.content || '';
        tokensUsed = chatRes.usage?.total_tokens || 0;
      } catch (err: any) {
        rawOutput = `ERROR_GATEWAY: ${err.message || String(err)}`;
      }

      const latencyMs = Date.now() - startMs;
      totalLatency += latencyMs;

      const scored = EvalScorer.scoreTestCase(tc, rawOutput, latencyMs, tokensUsed);
      results.push(scored);

      if (scored.passed) passedCount++;
      totalScore += scored.score;

      for (const [key, val] of Object.entries(scored.metricBreakdown)) {
        metricTotals[key as EvalMetricKey] += val;
      }
    }

    const testCount = dataset.length || 1;
    const overallScore = Math.round((totalScore / testCount) * 10) / 10;
    const avgLatency = Math.round(totalLatency / testCount);

    const metricAverages: Record<EvalMetricKey, number> = {
      schema_validity: Math.round(metricTotals.schema_validity / testCount),
      kb_groundedness: Math.round(metricTotals.kb_groundedness / testCount),
      anti_hallucination: Math.round(metricTotals.anti_hallucination / testCount),
      security_defense: Math.round(metricTotals.security_defense / testCount),
      persona_adherence: Math.round(metricTotals.persona_adherence / testCount),
      latency_efficiency: Math.round(metricTotals.latency_efficiency / testCount),
    };

    return {
      modelId: profile.modelId,
      modelName: profile.name,
      tier: profile.tier,
      category: profile.category,
      totalTests: testCount,
      passedTests: passedCount,
      overallScore,
      passedThreshold: overallScore >= PASSING_SCORE_THRESHOLD,
      metricAverages,
      averageLatencyMs: avgLatency,
      estimatedCostPer1kTurns: profile.tier === 'free' ? 0 : 250, // Estimasi nominal IDR
      recommendedPromptStyle: profile.promptStyle,
      results,
    };
  }
}
