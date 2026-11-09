import { Tx } from "../../../../db/client";
import type { ScheduleRecord } from "../jadwal.types";

/**
 * Mengambil daftar jadwal yang terkonfirmasi milik owner.
 * Mendukung filter rentang tanggal (timeMin & timeMax).
 */
export async function getSchedulesAction(
  tx: Tx,
  ownerId: string,
  filter?: { timeMin?: string; timeMax?: string }
): Promise<ScheduleRecord[]> {
  if (filter?.timeMin && filter?.timeMax) {
    return await tx<ScheduleRecord[]>`
      SELECT id, owner_id, google_event_id, title, start_at, end_at, status, source, created_at, updated_at
      FROM schedules
      WHERE owner_id = ${ownerId}
        AND status = 'confirmed'
        AND tstzrange(start_at, end_at, '[)') && tstzrange(${filter.timeMin}::timestamptz, ${filter.timeMax}::timestamptz, '[)')
      ORDER BY start_at ASC;
    `;
  }

  return await tx<ScheduleRecord[]>`
    SELECT id, owner_id, google_event_id, title, start_at, end_at, status, source, created_at, updated_at
    FROM schedules
    WHERE owner_id = ${ownerId}
      AND status = 'confirmed'
      AND end_at >= (now() - interval '7 days')
    ORDER BY start_at ASC
    LIMIT 200;
  `;
}
