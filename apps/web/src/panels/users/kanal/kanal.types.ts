export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface WhatsAppChannelState {
	status: ConnectionStatus;
	businessName: string;
	phoneNumberMasked: string;
	qrCaption: string;
	otpCode: string;
	isGeneratingOtp: boolean;
}

export interface TelegramChannelState {
	status: ConnectionStatus;
	botUsername: string;
	tokenMasked: string;
	webhookStatus: 'healthy' | 'error';
	webhookDetail: string;
	otpCode: string;
	isGeneratingOtp: boolean;
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

export interface ConnectionLogItem {
	id: string;
	timestamp: string;
	title: string;
	description: string;
}
