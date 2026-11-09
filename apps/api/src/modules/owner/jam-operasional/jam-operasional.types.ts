export interface DayScheduleConfig {
  id: string; // 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
  dayName: string; // 'Senin', 'Selasa', ...
  isOpen: boolean;
  openTime: string; // e.g. '08:00'
  closeTime: string; // e.g. '20:00'
}

export interface ScheduleExceptionConfig {
  id: string;
  date: string; // 'YYYY-MM-DD'
  dateLabel: string; // 'Selasa, 20 Oktober 2026'
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
  is24Hours?: boolean;
  weekly: DayScheduleConfig[];
  exceptions: ScheduleExceptionConfig[];
  outOfHours: OutOfHoursConfig;
}

export interface JamOperasionalResponse {
  business_hours: BusinessHoursData;
  timezone: string;
  auto_reply_enabled: boolean;
  admin_bot_name: string;
  business_name: string;
}

export interface UpdateJamOperasionalInput {
  business_hours: BusinessHoursData;
  auto_reply_enabled?: boolean;
}

export const DEFAULT_WEEKLY_SCHEDULE: DayScheduleConfig[] = [
  { id: "mon", dayName: "Senin", isOpen: true, openTime: "08:00", closeTime: "20:00" },
  { id: "tue", dayName: "Selasa", isOpen: true, openTime: "08:00", closeTime: "20:00" },
  { id: "wed", dayName: "Rabu", isOpen: true, openTime: "08:00", closeTime: "20:00" },
  { id: "thu", dayName: "Kamis", isOpen: true, openTime: "08:00", closeTime: "20:00" },
  { id: "fri", dayName: "Jumat", isOpen: true, openTime: "08:00", closeTime: "20:00" },
  { id: "sat", dayName: "Sabtu", isOpen: true, openTime: "08:00", closeTime: "20:00" },
  { id: "sun", dayName: "Minggu", isOpen: false, openTime: "08:00", closeTime: "20:00" },
];

export function getDefaultBusinessHours(businessName: string = "toko kami"): BusinessHoursData {
  return {
    is24Hours: true,
    weekly: DEFAULT_WEEKLY_SCHEDULE,
    exceptions: [],
    outOfHours: {
      isEnabled: true,
      message: `Terima kasih sudah menghubungi ${businessName}. Saat ini layanan kami sedang tutup di luar jam operasional. Pesan Anda akan dibalas pada jam buka berikutnya.`,
    },
  };
}
