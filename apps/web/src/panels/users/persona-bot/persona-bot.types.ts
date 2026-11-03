export type BotTone = 'ramah' | 'formal' | 'santai';

export interface BotPersonaConfig {
	botName: string;
	tone: BotTone;
	greetingMessage: string;
	additionalDirectives: string;
}

export interface AiModelItem {
	id: string;
	name: string;
	jenis: 'Berbayar' | 'Gratis';
	tipe: 'LLM' | 'LMM' | 'VLM';
	isSelected: boolean;
}
