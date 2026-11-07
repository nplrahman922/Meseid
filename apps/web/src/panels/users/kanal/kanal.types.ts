export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'conflict';

export interface WhatsAppChannelState {
	status: ConnectionStatus;
	businessName: string;
	phoneNumber: string | null;
	phoneNumberMasked: string;
	qrCaption: string;
	qrDataUrl?: string;
	conflictReason?: string | null;
	ownerPhone?: string | null;
	ownerPhoneVerified?: boolean;
}

export interface TelegramChannelState {
	status: ConnectionStatus;
	botId: string | null;
	botUsername: string;
	tokenMasked: string;
	webhookStatus: 'healthy' | 'error' | 'untested';
	webhookDetail: string;
}

export interface KanalStatusData {
	businessName: string;
	whatsapp: {
		status: ConnectionStatus;
		phoneNumber: string | null;
		qr: string | null;
		conflictReason?: string | null;
	};
	telegram: {
		status: ConnectionStatus;
		botId: string | null;
		botUsername: string | null;
		tokenMasked: string | null;
	};
	ownerPhone: string | null;
	ownerPhoneVerified: boolean;
}

export interface GoogleIntegrationState {
	status: ConnectionStatus;
	accountEmail: string;
	accountType: string;
	lastSyncedAt: string;
	calendarEnabled: boolean;
	driveEnabled: boolean;
	gmailEnabled: boolean;
}

export interface WhitelistContactItem {
	id: string;
	name: string;
	type: 'Grup' | 'Nomor';
	target: string;
	isActive: boolean;
	isSelected: boolean;
}

export interface AccessRuleItem {
	id: string;
	channel: 'whatsapp' | 'telegram';
	target_type: 'number' | 'group';
	target_id: string;
	target_name: string;
	custom_label: string | null;
	status: 'active' | 'disabled' | 'blocked';
	persona_mode: 'assistant' | 'admin';
	trigger_mode: 'mention_or_reply' | 'always';
	behavior_summary: string | null;
	behavior_analyzed_at: string | null;
	last_interaction_at: string | null;
	isSelected?: boolean;
	is_owner?: boolean;
}

export interface ConnectionLogItem {
	id: string;
	timestamp: string;
	title: string;
	description: string;
}
