export interface DaySchedule {
	id: string;
	dayName: string;
	isOpen: boolean;
	openTime: string;
	closeTime: string;
}

export interface ScheduleException {
	id: string;
	dateLabel: string;
	reason: string;
	isClosedAllDay: boolean;
}

export interface OutOfHoursConfig {
	isEnabled: boolean;
	message: string;
}
