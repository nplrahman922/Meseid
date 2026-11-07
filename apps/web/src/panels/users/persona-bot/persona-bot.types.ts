export type BotTone = 'ramah' | 'formal' | 'santai';

export interface BotPersonaConfig {
	botName: string;
	tone: BotTone;
	greetingMessage: string;
	additionalDirectives: string;
}

export interface BotPersonaData {
	botName: string;
	language: string;
	speakingStyles: string[];
	customRules: string[];
	isCustomRulesEnabled?: boolean;
}

export interface DualPersonaState {
	assistant: BotPersonaData;
	admin: BotPersonaData;
}

export interface AiModelItem {
	id: string;
	preset_code?: string;
	model_id: string;
	name: string;
	display_name?: string;
	description?: string;
	provider?: string;
	jenis: 'Berbayar' | 'Gratis';
	tier: 'free' | 'pro';
	tipe: 'LLM' | 'LMM' | 'VLM';
	score: number;
	badge?: string;
	supports_vision?: boolean;
	supports_audio?: boolean;
	supports_web_search?: boolean;
	supports_reasoning?: boolean;
	isAccessible: boolean;
	isSelected: boolean;
}
