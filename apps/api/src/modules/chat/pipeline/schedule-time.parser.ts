/**
 * Utility parser untuk mengekstrak tanggal, jam mulai, dan jam selesai
 * dari pesan percakapan dalam bahasa Indonesia (Zona WIB / UTC+7).
 */

export interface ParsedTimeRange {
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  extractedTitle?: string;
  notes?: string;
}

const MONTH_NAMES: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, agu: 7, ags: 7,
  september: 8, sep: 8,
  oktober: 9, okt: 9,
  november: 10, nov: 10,
  desember: 11, des: 11,
};

const DAY_OFFSETS: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
};

export class ScheduleTimeParser {
  /**
   * Mengekstrak jam (HH:mm) dari teks, misalnya "jam 10", "14.30", "pukul 09:00", "06:00 AM".
   */
  static extractHourMinute(text: string): { hour: number; minute: number } | null {
    const match =
      text.match(/(?:jam|pukul|pkl\.?)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam|am|pm)?/i) ||
      text.match(/\b(\d{1,2})[:.](\d{2})\s*(pagi|siang|sore|malam|am|pm)?\b/i) ||
      text.match(/\b(\d{1,2})\s*(am|pm)\b/i);

    if (!match) return null;

    let hour = parseInt(match[1] || match[0], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = (match[3] || match[2])?.toLowerCase();

    if ((period === "sore" || period === "malam" || period === "pm") && hour < 12) {
      hour += 12;
    }
    if (period === "siang" && hour >= 1 && hour <= 5) {
      hour += 12;
    }
    if (period === "am" && hour === 12) {
      hour = 0;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  }

  /**
   * Mengekstrak target tanggal (Date) dari teks dalam zona waktu WIB (UTC+7).
   */
  static parseDateTimeRange(text: string, referenceDate: Date = new Date()): ParsedTimeRange | null {
    const time = this.extractHourMinute(text);
    if (!time) return null;

    // Basis tanggal di WIB (UTC+7)
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
    const nowWib = new Date(referenceDate.getTime() + WIB_OFFSET_MS);

    let targetYear = nowWib.getUTCFullYear();
    let targetMonth = nowWib.getUTCMonth();
    let targetDay = nowWib.getUTCDate();

    const lower = text.toLowerCase();
    let hasExplicitDay = false;

    if (lower.includes("besok")) {
      targetDay += 1;
      hasExplicitDay = true;
    } else if (lower.includes("lusa")) {
      targetDay += 2;
      hasExplicitDay = true;
    } else if (lower.includes("hari ini")) {
      hasExplicitDay = true;
    } else {
      // Cek penyebutan nama hari (misal: "hari senin", "rabu besok")
      for (const [dayName, dayIndex] of Object.entries(DAY_OFFSETS)) {
        if (new RegExp(`\\b${dayName}\\b`, "i").test(lower)) {
          const currentDay = nowWib.getUTCDay();
          let diff = dayIndex - currentDay;
          if (diff <= 0) diff += 7;
          targetDay += diff;
          hasExplicitDay = true;
          break;
        }
      }

      // Cek format tanggal spesifik "15 november" atau "15 nov 2026"
      const dateMatch = lower.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/);
      if (dateMatch && MONTH_NAMES[dateMatch[2]!] !== undefined) {
        targetDay = parseInt(dateMatch[1]!, 10);
        targetMonth = MONTH_NAMES[dateMatch[2]!]!;
        if (dateMatch[3]) {
          targetYear = parseInt(dateMatch[3]!, 10);
        }
        hasExplicitDay = true;
      }
    }

    // Bangun waktu UTC dari komponen tanggal & jam di WIB (UTC+7)
    // Formula UTC: jam_UTC = jam_WIB - 7
    let startDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, time.hour - 7, time.minute, 0));

    // Jika pengguna tidak menyebutkan hari eksplisit dan jam yang diminta sudah lewat dari waktu saat ini di WIB,
    // asumsikan jadwal dibuat untuk besok hari
    if (!hasExplicitDay && startDate.getTime() < referenceDate.getTime()) {
      startDate = new Date(Date.UTC(targetYear, targetMonth, targetDay + 1, time.hour - 7, time.minute, 0));
    }

    // Default durasi agenda adalah 1 jam
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    // Ekstraksi judul agenda (membersihkan kata penunjuk waktu dan konektor)
    let extractedTitle = text
      .replace(/(?:jadwalkan|jadwal|agendakan|bikin jadwal|atur jadwal|buat jadwal|tambah jadwal|booking\s*kan|booking|reservasi|janji temu)/gi, "")
      .replace(/\b(?:besok|lusa|hari ini|nanti|siang|pagi|sore|malam)\b/gi, "")
      .replace(/(?:pukul|jam|pkl\.?)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|wib)?/gi, "")
      .replace(/\b\d{1,2}[:.]\d{2}\s*(?:am|pm|wib)?\b/gi, "")
      .replace(/\b(?:dengan tujuan|tujuan)\s*[:\-]?/gi, "")
      .replace(/\b(?:dengan|untuk|pada|di|oke|ok|tolong|coba|bisa|juga|kan)\b/gi, "")
      .replace(/[:\-\.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!extractedTitle || extractedTitle.length < 2) {
      extractedTitle = "Agenda Usaha";
    } else {
      extractedTitle = extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1);
    }

    return {
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      extractedTitle,
    };
  }
}
