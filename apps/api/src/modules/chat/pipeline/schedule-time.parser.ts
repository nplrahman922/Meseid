/**
 * Utility parser untuk mengekstrak tanggal, jam mulai, dan jam selesai
 * dari pesan percakapan dalam bahasa Indonesia.
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
   * Mengekstrak jam (HH:mm) dari teks, misalnya "jam 10", "14.30", "pukul 09:00".
   */
  static extractHourMinute(text: string): { hour: number; minute: number } | null {
    // Pola: jam 10.30, jam 14:00, pukul 09.00, jam 10 malam (22:00)
    const match = text.match(/(?:jam|pukul|pkl\.?)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?/i) ||
                  text.match(/\b(\d{1,2})[:.](\d{2})\b/);

    if (!match) return null;

    let hour = parseInt(match[1] || match[0], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3]?.toLowerCase();

    if (period === "siang" && hour < 12) hour += 12;
    if (period === "sore" && hour < 12) hour += 12;
    if (period === "malam" && hour < 12) hour += 12;

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
    const targetDate = new Date(referenceDate);
    targetDate.setHours(time.hour, time.minute, 0, 0);

    const lower = text.toLowerCase();
    if (lower.includes("besok")) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes("lusa")) {
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (lower.includes("hari ini")) {
      // hari ini
    } else {
      // Cek penyebutan nama hari (misal: "hari senin", "rabu besok")
      for (const [dayName, dayIndex] of Object.entries(DAY_OFFSETS)) {
        if (new RegExp(`\\b${dayName}\\b`, "i").test(lower)) {
          const currentDay = targetDate.getDay();
          let diff = dayIndex - currentDay;
          if (diff <= 0) diff += 7;
          targetDate.setDate(targetDate.getDate() + diff);
          break;
        }
      }

      // Cek format tanggal spesifik "15 november" atau "15 nov 2026"
      const dateMatch = lower.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/);
      if (dateMatch && MONTH_NAMES[dateMatch[2]!] !== undefined) {
        const day = parseInt(dateMatch[1]!, 10);
        const month = MONTH_NAMES[dateMatch[2]!]!;
        const year = dateMatch[3] ? parseInt(dateMatch[3]!, 10) : targetDate.getFullYear();
        targetDate.setFullYear(year, month, day);
      }
    }

    // Default durasi agenda adalah 1 jam
    const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);

    // Ekstraksi judul agenda (membersihkan kata penunjuk waktu)
    let extractedTitle = text
      .replace(/(?:jadwalkan|jadwal|agendakan|bikin jadwal|atur jadwal|buat jadwal|booking|reservasi|janji temu)/gi, "")
      .replace(/(?:besok|lusa|hari ini|pukul|jam)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:pagi|siang|sore|malam)?/gi, "")
      .replace(/\b(?:dengan|untuk|pada|di)\b/gi, "")
      .trim();

    if (!extractedTitle || extractedTitle.length < 3) {
      extractedTitle = "Agenda Usaha";
    }

    return {
      startAt: targetDate.toISOString(),
      endAt: endDate.toISOString(),
      extractedTitle,
    };
  }
}
