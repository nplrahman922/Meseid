import { PromptEngine } from '../prompts/prompt-engine';
import type { BusinessContext } from '../types';
import type { ModelProfile } from '../eval/eval.types';

/**
 * PersonaPromptBuilder Facade:
 * Mendelegasikan kompilasi prompt modular ke Dynamic Prompt Engine.
 */
export class PersonaPromptBuilder {
  static buildSystemPrompt(
    persona: 'assistant' | 'admin',
    businessContext?: BusinessContext,
    modelProfile?: ModelProfile
  ): string {
    return PromptEngine.compileSystemPrompt({
      persona,
      businessContext,
      modelProfile,
    });
  }
}
