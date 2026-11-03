export interface MetricsSummary {
	transactionsCount: number;
	transactionsVerified: number;
	cashBalance: number;
	initialCash: number;
	messagesCount: number;
	messagesChannels: string;
	remainingTokens: number;
	remainingTokensPercent: number;
	periodLabel: string;
}

export interface ChannelMiniStatus {
	channel: 'whatsapp' | 'telegram' | 'google';
	name: string;
	status: 'connected' | 'disconnected';
	detail: string;
}

export interface WeeklyCashFlowDay {
	dayCode: string;
	income: number;
	expense: number;
}

export interface WeeklyFinanceSummary {
	periodLabel: string;
	surplus: number;
	totalIncome: number;
	totalExpense: number;
	days: WeeklyCashFlowDay[];
	breakdownText: string;
}

export interface RecentActivityItem {
	id: string;
	title: string;
	amountOrAction: string;
	timestamp: string;
	channelOrSource: string;
	actionUrl?: string;
}

export interface UpcomingScheduleItem {
	id: string;
	title: string;
	timeRange: string;
	statusOrType: string;
}
