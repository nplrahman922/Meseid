export * from './eval.context';
export * from './eval.dataset-admin';
export * from './eval.dataset-assistant';

import { ADMIN_EVAL_DATASET } from './eval.dataset-admin';
import { ASSISTANT_EVAL_DATASET } from './eval.dataset-assistant';
import type { EvalTestCase } from './eval.types';

/**
 * Dataset Terpadu Meseid yang menggabungkan seluruh suite pengujian.
 */
export const EVAL_DATASET: EvalTestCase[] = [
  ...ADMIN_EVAL_DATASET,
  ...ASSISTANT_EVAL_DATASET,
];

/**
 * Mengambil dataset spesifik sesuai persona yang ingin dievaluasi.
 */
export function getDatasetForPersona(persona: 'admin' | 'assistant'): EvalTestCase[] {
  return persona === 'admin' ? ADMIN_EVAL_DATASET : ASSISTANT_EVAL_DATASET;
}
