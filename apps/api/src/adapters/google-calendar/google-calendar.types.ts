export interface GoogleCalendarDateTime {
  dateTime: string; // ISO 8601 string
  timeZone?: string;
}

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: GoogleCalendarDateTime;
  end: GoogleCalendarDateTime;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: GoogleCalendarDateTime;
  end: GoogleCalendarDateTime;
  status?: string;
  htmlLink?: string;
}

export interface GoogleFreeBusySlot {
  start: string;
  end: string;
}

export interface GoogleCalendarStatusInfo {
  connected: boolean;
  calendarId: string;
  scopes: string[];
  hasCalendarScope: boolean;
  lastSyncedAt: string | null;
}
