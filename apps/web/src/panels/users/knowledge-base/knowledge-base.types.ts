export type KnowledgeBaseTab = 'entries' | 'unanswered';

export interface KnowledgeBaseEntry {
	id: string;
	title: string;
	category: string;
	content: string;
	updatedAt: string;
}

export interface UnansweredQuestion {
	id: string;
	questionText: string;
	channel: 'whatsapp' | 'telegram';
	timestamp: string;
	timesAsked: number;
}

export interface NewEntryPayload {
	title: string;
	category: string;
	content: string;
}
