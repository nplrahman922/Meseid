export interface OverviewData {
	userName: string;
	businessName?: string;
	businessType?: 'kuliner' | 'toko' | 'jasa' | 'lainnya';
	customCategory?: string;
	businessDescription?: string;
	ownerPhone?: string;
	phoneVerified?: boolean;
	telegramToken?: string;
	telegramVerified?: boolean;
	telegramOwnerChatId?: string;
	whatsappConnected?: boolean;
	agreedToPolicy: boolean;
	storeBotName?: string;
	assistantBotName?: string;
	storeSpeakingStyles: string[];
	storeCustomRules: string[];
	assistantSpeakingStyles: string[];
	assistantCustomRules: string[];
	knowledgeBase: Array<{
		title: string;
		category: string;
		description: string;
		onlyAssistant: boolean;
	}>;
}

export interface OverviewStatus {
	isCompleted: boolean;
	lastStep: number;
}

export const defaultOverviewData: OverviewData = {
	userName: '',
	businessName: '',
	businessType: 'kuliner',
	customCategory: '',
	businessDescription: '',
	ownerPhone: '',
	phoneVerified: false,
	telegramToken: '',
	whatsappConnected: false,
	agreedToPolicy: false,
	storeBotName: '',
	assistantBotName: '',
	storeSpeakingStyles: ['Ramah', 'Informatif'],
	storeCustomRules: [],
	assistantSpeakingStyles: ['Ramah', 'Informatif'],
	assistantCustomRules: [],
	knowledgeBase: []
};
