import { withSystemContext } from "../../../db/client";
import { createModuleLogger } from "../../../logs";
import { getDefaultBusinessHours, BusinessHoursData } from "../../owner/jam-operasional/jam-operasional.types";

const hoursLogger = createModuleLogger("operating-hours-evaluator");

export interface OperatingHoursEvaluationResult {
  isClosed: boolean;
  shouldIntercept: boolean;
  replyMessage?: string;
  botName?: string;
  reason?: string;
}

export class OperatingHoursEvaluator {
  /**
   * Normalisasi format jam seperti "08.00 WIB", "08:00", atau "8:00" menjadi "HH:mm" (24 jam)
   */
  static normalizeTime(timeStr?: string | null): string | null {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2})[.:](\d{2})/);
    if (!match) return null;
    const hour = match[1].padStart(2, "0");
    const minute = match[2];
    return `${hour}:${minute}`;
  }

  /**
   * Mengambil komponen waktu lokal berdasarkan timezone pemilik (default Asia/Jakarta)
   */
  static getLocalTimeParts(date: Date, timeZone: string): {
    dateStr: string; // YYYY-MM-DD
    dayId: string;   // 'mon', 'tue', ...
    timeStr: string; // HH:mm
  } {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      let year = "";
      let month = "";
      let day = "";
      let hour = "00";
      let minute = "00";

      for (const p of parts) {
        if (p.type === "year") year = p.value;
        if (p.type === "month") month = p.value;
        if (p.type === "day") day = p.value;
        if (p.type === "hour") hour = p.value === "24" ? "00" : p.value.padStart(2, "0");
        if (p.type === "minute") minute = p.value.padStart(2, "0");
      }

      // Ambil hari dalam seminggu
      const dayOfWeekFormatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
      const weekdayShort = dayOfWeekFormatter.format(date).toLowerCase();
      const dayMap: Record<string, string> = {
        mon: "mon",
        tue: "tue",
        wed: "wed",
        thu: "thu",
        fri: "fri",
        sat: "sat",
        sun: "sun",
      };
      const dayId = dayMap[weekdayShort] || "mon";

      return {
        dateStr: `${year}-${month}-${day}`,
        dayId,
        timeStr: `${hour}:${minute}`,
      };
    } catch (err: any) {
      hoursLogger.warn(`Gagal memformat zona waktu "${timeZone}": ${err.message}. Menggunakan fallback UTC+7.`);
      // Fallback Asia/Jakarta (UTC+7)
      const utc = date.getTime() + date.getTimezoneOffset() * 60000;
      const wib = new Date(utc + 7 * 3600000);
      const year = wib.getFullYear();
      const month = String(wib.getMonth() + 1).padStart(2, "0");
      const day = String(wib.getDate()).padStart(2, "0");
      const hour = String(wib.getHours()).padStart(2, "0");
      const minute = String(wib.getMinutes()).padStart(2, "0");
      const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      return {
        dateStr: `${year}-${month}-${day}`,
        dayId: days[wib.getDay()],
        timeStr: `${hour}:${minute}`,
      };
    }
  }

  /**
   * Mengevaluasi apakah pesan saat ini tiba di luar jam operasional.
   * Owner selalu di-bypass (tidak dicegat).
   */
  static async evaluate(
    ownerId: string,
    isOwner: boolean,
    effectivePersona?: "assistant" | "admin",
    date: Date = new Date()
  ): Promise<OperatingHoursEvaluationResult> {
    // 1. Owner & Asisten Pribadi selalu dilayani 24/7 (Bypass)
    if (isOwner || effectivePersona === "assistant") {
      return { isClosed: false, shouldIntercept: false };
    }

    try {
      return await withSystemContext(async (tx) => {
        const [ownerRow] = await tx<{ business_name: string; owner_name: string | null; timezone: string }[]>`
          SELECT business_name, owner_name, timezone
          FROM owners
          WHERE id = ${ownerId}::uuid
          LIMIT 1;
        `;

        if (!ownerRow) {
          return { isClosed: false, shouldIntercept: false };
        }

        const [botConfig] = await tx<{
          business_hours: any;
          auto_reply_enabled: boolean;
          admin_bot_name: string;
        }[]>`
          SELECT business_hours, auto_reply_enabled, admin_bot_name
          FROM bot_configs
          WHERE owner_id = ${ownerId}::uuid
          LIMIT 1;
        `;

        // Jika saklar auto_reply dimatikan global
        if (botConfig && botConfig.auto_reply_enabled === false) {
          return { isClosed: false, shouldIntercept: false };
        }

        const timezone = ownerRow.timezone || "Asia/Jakarta";
        const { dateStr, dayId, timeStr } = this.getLocalTimeParts(date, timezone);

        let rawHours = botConfig?.business_hours;
        if (typeof rawHours === "string") {
          try {
            rawHours = JSON.parse(rawHours);
          } catch {
            rawHours = null;
          }
        }

        // Jika pemilik usaha belum pernah menyetel jam operasional di database atau memilih mode 24 jam penuh
        if (
          !rawHours ||
          typeof rawHours !== "object" ||
          rawHours.is24Hours === true ||
          !Array.isArray(rawHours.weekly) ||
          rawHours.weekly.length === 0
        ) {
          return { isClosed: false, shouldIntercept: false };
        }

        const businessHours: BusinessHoursData = rawHours;

        let isClosed = false;
        let closedReason = "";

        // 2. Cek Tanggal Pengecualian Khusus (Exceptions)
        const matchingException = (businessHours.exceptions || []).find((e) => e.date === dateStr);
        if (matchingException) {
          if (matchingException.isClosedAllDay) {
            isClosed = true;
            closedReason = `Pengecualian libur khusus (${matchingException.reason || "Tutup sepanjang hari"})`;
          } else if (matchingException.openTime && matchingException.closeTime) {
            const openNorm = this.normalizeTime(matchingException.openTime);
            const closeNorm = this.normalizeTime(matchingException.closeTime);
            if (openNorm && closeNorm && (timeStr < openNorm || timeStr > closeNorm)) {
              isClosed = true;
              closedReason = `Di luar jam khusus pengecualian (${matchingException.openTime} - ${matchingException.closeTime})`;
            }
          }
        } else {
          // 3. Cek Jadwal Mingguan Reguler (Weekly Schedule)
          const dayConfig = (businessHours.weekly || []).find((d) => d.id === dayId);
          if (!dayConfig || !dayConfig.isOpen) {
            isClosed = true;
            closedReason = `Toko libur/tutup pada hari ${dayConfig?.dayName || dayId}`;
          } else {
            const openNorm = this.normalizeTime(dayConfig.openTime) || "08:00";
            const closeNorm = this.normalizeTime(dayConfig.closeTime) || "20:00";
            if (timeStr < openNorm || timeStr > closeNorm) {
              isClosed = true;
              closedReason = `Di luar jam buka operasional (${dayConfig.openTime} - ${dayConfig.closeTime}, saat ini ${timeStr})`;
            }
          }
        }

        if (!isClosed) {
          return { isClosed: false, shouldIntercept: false };
        }

        // 4. Jika Toko Tutup, cek apakah Balasan Luar Jam diaktifkan
        const outOfHoursConfig = businessHours.outOfHours;
        const isOutOfHoursActive = outOfHoursConfig?.isEnabled !== false;

        if (!isOutOfHoursActive) {
          return {
            isClosed: true,
            shouldIntercept: false,
            reason: closedReason,
          };
        }

        const botName = botConfig?.admin_bot_name || "Admin Toko";
        const ownerName = ownerRow.owner_name || "Pemilik Toko";
        const businessName = ownerRow.business_name || "toko kami";

        let rawTemplate = outOfHoursConfig?.message || getDefaultBusinessHours(businessName).outOfHours.message;
        const formattedReply = rawTemplate
          .replace(/\{businessName\}/gi, businessName)
          .replace(/\{botName\}/gi, botName)
          .replace(/\{userName\}/gi, ownerName);

        hoursLogger.info(`Pesan pelanggan dicegat karena toko tutup: ${closedReason}`, {
          ownerId,
          dateStr,
          timeStr,
          timezone,
        });

        return {
          isClosed: true,
          shouldIntercept: true,
          replyMessage: formattedReply,
          botName,
          reason: closedReason,
        };
      });
    } catch (err: any) {
      hoursLogger.error(`Gagal mengevaluasi jam operasional: ${err.message}`, err);
      // Fail-open ke alur normal jika ada kegagalan query agar pesan tetap terjawab
      return { isClosed: false, shouldIntercept: false };
    }
  }
}
