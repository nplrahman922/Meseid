export type BotTone = 'ramah' | 'formal' | 'santai';

export interface BotPersonaConfig {
	botName: string;
	tone: BotTone;
	greetingMessage: string;
	additionalDirectives: string;
}

export interface AiModelItem {
	id: string;
	model_id: string;
	name: string;
	provider?: string;
	jenis: 'Berbayar' | 'Gratis';
	tier: 'free' | 'pro';
	tipe: 'LLM' | 'LMM' | 'VLM';
	score: number;
	badge?: string;
	isAccessible: boolean;
	isSelected: boolean;
}
