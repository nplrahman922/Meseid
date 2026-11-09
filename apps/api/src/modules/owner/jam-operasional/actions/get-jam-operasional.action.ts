import { Tx } from "../../../../db/client";
import {
  JamOperasionalResponse,
  BusinessHoursData,
  getDefaultBusinessHours,
  DEFAULT_WEEKLY_SCHEDULE,
} from "../jam-operasional.types";

/**
 * Mengambil data jam operasional, zona waktu, dan preferensi balasan otomatis
 * untuk pemilik bisnis tertentu (multi-tenant compliant).
 */
export async function getJamOperasional(
  tx: Tx,
  ownerId: string
): Promise<JamOperasionalResponse | null> {
  const [ownerRow] = await tx<{ business_name: string; timezone: string }[]>`
    SELECT business_name, timezone
    FROM owners
    WHERE id = ${ownerId}::uuid
    LIMIT 1;
  `;

  if (!ownerRow) return null;

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

  let rawHours = botConfig?.business_hours;
  if (typeof rawHours === "string") {
    try {
      rawHours = JSON.parse(rawHours);
    } catch {
      rawHours = null;
    }
  }
  let parsedHours: BusinessHoursData;

  if (
    rawHours &&
    typeof rawHours === "object" &&
    Array.isArray(rawHours.weekly) &&
    rawHours.weekly.length > 0
  ) {
    parsedHours = {
      weekly: rawHours.weekly.map((d: any, idx: number) => ({
        id: String(d.id || DEFAULT_WEEKLY_SCHEDULE[idx]?.id || `day_${idx}`),
        dayName: String(d.dayName || DEFAULT_WEEKLY_SCHEDULE[idx]?.dayName || `Hari ${idx + 1}`),
        isOpen: Boolean(d.isOpen),
        openTime: String(d.openTime || "08:00"),
        closeTime: String(d.closeTime || "20:00"),
      })),
      exceptions: Array.isArray(rawHours.exceptions)
        ? rawHours.exceptions.map((e: any) => ({
            id: String(e.id || `exc_${Date.now()}`),
            date: String(e.date || ""),
            dateLabel: String(e.dateLabel || e.date || ""),
            reason: String(e.reason || "Libur operasional"),
            isClosedAllDay: Boolean(e.isClosedAllDay ?? true),
            openTime: e.openTime ? String(e.openTime) : null,
            closeTime: e.closeTime ? String(e.closeTime) : null,
          }))
        : [],
      outOfHours: {
        isEnabled: Boolean(rawHours.outOfHours?.isEnabled ?? true),
        message: String(
          rawHours.outOfHours?.message ||
            getDefaultBusinessHours(ownerRow.business_name).outOfHours.message
        ),
      },
    };
  } else {
    parsedHours = getDefaultBusinessHours(ownerRow.business_name);
  }

  return {
    business_hours: parsedHours,
    timezone: ownerRow.timezone || "Asia/Jakarta",
    auto_reply_enabled: botConfig ? Boolean(botConfig.auto_reply_enabled) : true,
    admin_bot_name: botConfig?.admin_bot_name || "Admin Toko",
    business_name: ownerRow.business_name,
  };
}
