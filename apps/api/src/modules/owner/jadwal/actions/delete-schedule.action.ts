import { Tx } from "../../../../db/client";
import { GoogleCalendarClient } from "../../../../adapters/google-calendar";

/**
 * Membatalkan / menghapus jadwal acara milik owner.
 * Sinkronisasi pembatalan juga dikirimkan ke Google Calendar jika terhubung.
 */
export async function deleteScheduleAction(
  tx: Tx,
  ownerId: string,
  scheduleId: string
): Promise<{ success: boolean; id: string }> {
  const existing = await tx<{ id: string; google_event_id: string | null }[]>`
    SELECT id, google_event_id
    FROM schedules
    WHERE id = ${scheduleId} AND owner_id = ${ownerId}
    LIMIT 1;
  `;

  if (existing.length === 0) {
    throw new Error("Jadwal tidak ditemukan atau tidak memiliki akses.");
  }

  const record = existing[0]!;

  // 1. Hapus dari Google Calendar jika ada ID event
  if (record.google_event_id) {
    try {
      await GoogleCalendarClient.deleteCalendarEvent(tx, ownerId, record.google_event_id);
    } catch {
      // Non-fatal
    }
  }

  // 2. Tandai dibatalkan pada database
  await tx`
    UPDATE schedules
    SET status = 'cancelled', updated_at = now()
    WHERE id = ${scheduleId} AND owner_id = ${ownerId};
  `;

  return { success: true, id: scheduleId };
}
