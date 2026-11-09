export interface DaySchedule {
	id: string;
	dayName: string;
	isOpen: boolean;
	openTime: string;
	closeTime: string;
}

export interface ScheduleException {
	id: string;
	date: string; // YYYY-MM-DD
	dateLabel: string;
	reason: string;
	isClosedAllDay: boolean;
	openTime?: string | null;
	closeTime?: string | null;
}

export interface OutOfHoursConfig {
	isEnabled: boolean;
	message: string;
}

export interface BusinessHoursData {
	weekly: DaySchedule[];
	exceptions: ScheduleException[];
	outOfHours: OutOfHoursConfig;
}

export interface JamOperasionalData {
	business_hours: BusinessHoursData;
	timezone: string;
	auto_reply_enabled: boolean;
	admin_bot_name: string;
	business_name: string;
}

export interface UpdateJamOperasionalPayload {
	business_hours: BusinessHoursData;
	auto_reply_enabled?: boolean;
}
