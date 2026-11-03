export type CalendarViewMode = 'bulan' | 'minggu';

export type EventCategory = 'order' | 'reminder' | 'holiday';

export interface ConfirmedEvent {
	id: string;
	title: string;
	dateText: string;
	timeRange: string;
	customerName?: string;
	note: string;
	type: EventCategory;
	actionLabel?: string;
}

export interface WeeklyDaySchedule {
	dayKey: string;
	dayName: string;
	dateNumber: number;
	eventText: string;
	isOff?: boolean;
}

export interface OrderInquiry {
	id: string;
	customerName: string;
	orderSummary: string;
	slotDate: string;
	slotTime: string;
	channel: 'whatsapp' | 'telegram';
	receivedAt: string;
	hasCollision: boolean;
	collisionDetail?: string;
	status: 'pending' | 'approved' | 'rejected' | 'negotiating';
}
