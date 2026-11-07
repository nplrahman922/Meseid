export type KnowledgeBaseTab = 'entries' | 'unanswered';

export interface KnowledgeBaseEntry {
	id: string;
	title: string;
	category: string;
	content: string;
	is_internal?: boolean;
	created_at?: string;
	updated_at?: string;
	updatedAt?: string;
}

export interface UnansweredQuestion {
	id: string;
	question_text?: string;
	questionText?: string;
	channel?: 'whatsapp' | 'telegram';
	timestamp?: string;
	times_asked?: number;
	timesAsked?: number;
	resolved?: boolean;
	resolved_by_kb_id?: string | null;
	rejection_reason?: string;
	rejectionReason?: string;
	created_at?: string;
	updated_at?: string;
}

export interface NewEntryPayload {
	title: string;
	category: string;
	content: string;
	is_internal?: boolean;
}

export interface CsvKnowledgeBaseItem {
	title: string;
	category: string;
	content: string;
	is_internal?: boolean;
}
