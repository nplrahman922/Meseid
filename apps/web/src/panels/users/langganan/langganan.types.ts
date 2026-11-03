export type BillingInterval = 'monthly' | 'yearly';

export type PlanType = 'gratis' | 'pro';

export interface PaymentHistoryItem {
	id: string;
	orderNumber: string;
	productName: string;
	txDate: string;
	amount: number;
	status: string;
	receiptUrl?: string;
}

export interface TokenUsageInfo {
	used: number;
	total: number;
	percentage: number;
	remaining: number;
	resetDateText: string;
	statusLabel: string;
}
