import { Tx } from "../../../../db/client";
import { GoogleCalendarClient } from "../../../../adapters/google-calendar";

/**
 * Sinkronisasi dua arah: menarik acara terbaru dari Google Calendar ke tabel schedules lokal.
 */
export async function syncGoogleCalendarAction(
  tx: Tx,
  ownerId: string
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const events = await GoogleCalendarClient.listCalendarEvents(tx, ownerId, timeMin, timeMax);

  let syncedCount = 0;
  for (const ev of events) {
    if (!ev.id || !ev.start?.dateTime || !ev.end?.dateTime) continue;

    const startAt = new Date(ev.start.dateTime);
    const endAt = new Date(ev.end.dateTime);
    if (endAt <= startAt) continue;

    try {
      await tx`
        INSERT INTO schedules (
          owner_id,
          google_event_id,
          title,
          start_at,
          end_at,
          status,
          source
        )
        VALUES (
          ${ownerId},
          ${ev.id},
          ${ev.summary || "Agenda Google Calendar"},
          ${startAt.toISOString()}::timestamptz,
          ${endAt.toISOString()}::timestamptz,
          'confirmed',
          'dashboard'
        )
        ON CONFLICT (owner_id, google_event_id) DO UPDATE
        SET title = EXCLUDED.title,
            start_at = EXCLUDED.start_at,
            end_at = EXCLUDED.end_at,
            status = 'confirmed',
            updated_at = now();
      `;
      syncedCount++;
    } catch {
      // Lewati jika bentrok dengan aturan GiST yang sudah ada
    }
  }

  await tx`
    UPDATE google_connections
    SET updated_at = now()
    WHERE owner_id = ${ownerId};
  `;

  return {
    success: true,
    syncedCount,
    message: `Berhasil menyinkronkan ${syncedCount} agenda dari Google Calendar.`,
  };
}
