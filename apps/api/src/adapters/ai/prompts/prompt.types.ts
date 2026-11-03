import type { BusinessContext } from '../types';
import type { ModelProfile } from '../eval/eval.types';

export interface PromptTemplateVariables {
  businessName: string;
  businessType: string;
  botName: string;
  customPersonaPrompt: string;
  knowledgeBaseContext: string;
  memoryDigest: string;
  nowWib: string;
}

export type PromptTemplateKey = 'admin-store' | 'assistant-owner' | 'compact-free';

export interface PromptEngineInput {
  persona: 'assistant' | 'admin';
  businessContext?: BusinessContext;
  modelProfile?: ModelProfile;
}
