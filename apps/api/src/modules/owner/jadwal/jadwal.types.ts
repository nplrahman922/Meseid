export type ScheduleStatus = "confirmed" | "cancelled" | "tentative";
export type ScheduleSource = "chat" | "booking" | "dashboard";

export interface ScheduleRecord {
  id: string;
  owner_id: string;
  google_event_id: string | null;
  title: string;
  start_at: Date | string;
  end_at: Date | string;
  status: ScheduleStatus;
  source: ScheduleSource;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateScheduleInput {
  title: string;
  start_at: string; // ISO 8601
  end_at: string; // ISO 8601
  source?: ScheduleSource;
  description?: string;
}

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface BookingRecord {
  id: string;
  owner_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  requested_start_at: Date | string;
  requested_end_at: Date | string;
  status: BookingStatus;
  schedule_id: string | null;
  notes: string | null;
  has_collision?: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface RespondBookingInput {
  bookingId: string;
  action: "approve" | "reject";
  notes?: string;
}

export interface GoogleCalendarStatusPayload {
  connected: boolean;
  calendarId: string;
  scopes: string[];
  hasCalendarScope: boolean;
  lastSyncedAt: string | null;
}
