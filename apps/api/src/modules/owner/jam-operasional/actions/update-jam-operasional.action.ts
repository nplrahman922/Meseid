import { Tx } from "../../../../db/client";
import {
  UpdateJamOperasionalInput,
  JamOperasionalResponse,
  BusinessHoursData,
  DEFAULT_WEEKLY_SCHEDULE,
} from "../jam-operasional.types";
import { getJamOperasional } from "./get-jam-operasional.action";

/**
 * Memvalidasi dan menyimpan konfigurasi jam operasional serta balasan otomatis ke bot_configs.
 * Mendukung upsert jika bot_configs belum diinisialisasi.
 */
export async function updateJamOperasional(
  tx: Tx,
  ownerId: string,
  input: UpdateJamOperasionalInput
): Promise<JamOperasionalResponse> {
  const weekly = Array.isArray(input.business_hours?.weekly)
    ? input.business_hours.weekly.map((d, idx) => ({
        id: String(d.id || DEFAULT_WEEKLY_SCHEDULE[idx]?.id || `day_${idx}`),
        dayName: String(d.dayName || DEFAULT_WEEKLY_SCHEDULE[idx]?.dayName || `Hari ${idx + 1}`),
        isOpen: Boolean(d.isOpen),
        openTime: String(d.openTime || "08:00").trim(),
        closeTime: String(d.closeTime || "20:00").trim(),
      }))
    : DEFAULT_WEEKLY_SCHEDULE;

  const exceptions = Array.isArray(input.business_hours?.exceptions)
    ? input.business_hours.exceptions.map((e, idx) => ({
        id: String(e.id || `exc_${Date.now()}_${idx}`),
        date: String(e.date || "").trim(),
        dateLabel: String(e.dateLabel || e.date || "").trim(),
        reason: String(e.reason || "Libur khusus").trim(),
        isClosedAllDay: Boolean(e.isClosedAllDay ?? true),
        openTime: e.openTime ? String(e.openTime).trim() : null,
        closeTime: e.closeTime ? String(e.closeTime).trim() : null,
      }))
    : [];

  const outOfHours = {
    isEnabled: Boolean(input.business_hours?.outOfHours?.isEnabled ?? true),
    message: String(input.business_hours?.outOfHours?.message || "").trim(),
  };

  const cleanBusinessHours: BusinessHoursData = {
    is24Hours: Boolean(input.business_hours?.is24Hours),
    weekly,
    exceptions,
    outOfHours,
  };

  const businessHoursJson = JSON.stringify(cleanBusinessHours);
  const autoReply = input.auto_reply_enabled !== undefined ? input.auto_reply_enabled : null;

  await tx`
    INSERT INTO bot_configs (
      owner_id,
      assistant_bot_name,
      admin_bot_name,
      auto_reply_enabled,
      business_hours
    )
    VALUES (
      ${ownerId}::uuid,
      'Asisten Bisnis',
      'Admin Toko',
      COALESCE(${autoReply}, true),
      ${businessHoursJson}::jsonb
    )
    ON CONFLICT (owner_id) DO UPDATE
    SET
      business_hours = ${businessHoursJson}::jsonb,
      auto_reply_enabled = COALESCE(${autoReply}, bot_configs.auto_reply_enabled),
      updated_at = now();
  `;

  const updated = await getJamOperasional(tx, ownerId);
  if (!updated) {
    throw new Error("Gagal mengambil data jam operasional setelah pembaruan");
  }

  return updated;
}
