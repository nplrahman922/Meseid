import { Tx } from "../../../../db/client";
import { GoogleCalendarClient } from "../../../../adapters/google-calendar";
import type { CreateScheduleInput, ScheduleRecord } from "../jadwal.types";

/**
 * Membuat jadwal baru setelah memeriksa deteksi tabrakan waktu (conflict detection).
 * Jika akun Google Calendar terhubung, acara juga disinkronkan ke Google Calendar.
 */
export async function createScheduleAction(
  tx: Tx,
  ownerId: string,
  input: CreateScheduleInput
): Promise<ScheduleRecord> {
  const startDate = new Date(input.start_at);
  const endDate = new Date(input.end_at);

  if (endDate <= startDate) {
    throw new Error("Waktu selesai jadwal harus lebih lambat dari waktu mulai.");
  }

  // 1. Periksa tabrakan jadwal dengan fungsi GiST fn_check_conflict
  const conflictCheck = await tx<{ fn_check_conflict: boolean }[]>`
    SELECT fn_check_conflict(${ownerId}, ${input.start_at}::timestamptz, ${input.end_at}::timestamptz);
  `;

  if (conflictCheck[0]?.fn_check_conflict) {
    throw new Error("Slot waktu yang dipilih bertabrakan dengan agenda yang sudah terkonfirmasi.");
  }

  // 2. Buat event di Google Calendar jika terhubung
  let googleEventId: string | null = null;
  try {
    const googleEvent = await GoogleCalendarClient.createCalendarEvent(tx, ownerId, {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.start_at },
      end: { dateTime: input.end_at },
    });
    if (googleEvent?.id) {
      googleEventId = googleEvent.id;
    }
  } catch (err: any) {
    // Non-fatal jika sync Google gagal saat pembuatan offline
  }

  // 3. Simpan ke database schedules
  const inserted = await tx<ScheduleRecord[]>`
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
      ${googleEventId},
      ${input.title},
      ${input.start_at}::timestamptz,
      ${input.end_at}::timestamptz,
      'confirmed',
      ${input.source || "dashboard"}
    )
    RETURNING id, owner_id, google_event_id, title, start_at, end_at, status, source, created_at, updated_at;
  `;

  return inserted[0]!;
}
