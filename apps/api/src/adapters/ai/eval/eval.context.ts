export * from './eval.context-warung';
export * from './eval.context-fashion';
export * from './eval.context-bengkel';

import { WARUNG_BU_RINA_CONTEXT } from './eval.context-warung';
import { ZAHRA_HIJAB_CONTEXT } from './eval.context-fashion';
import { BINTANG_BENGKEL_CONTEXT } from './eval.context-bengkel';
import type { BusinessContext } from '../types';

export type StoreDomain = 'kuliner' | 'fashion' | 'bengkel';

export const ALL_STORE_CONTEXTS: Record<StoreDomain, BusinessContext> = {
  kuliner: WARUNG_BU_RINA_CONTEXT,
  fashion: ZAHRA_HIJAB_CONTEXT,
  bengkel: BINTANG_BENGKEL_CONTEXT,
};

/**
 * Mengambil konteks pengujian spesifik berdasarkan domain usaha.
 */
export function getStoreContext(domain: StoreDomain): BusinessContext {
  return ALL_STORE_CONTEXTS[domain] || WARUNG_BU_RINA_CONTEXT;
}
