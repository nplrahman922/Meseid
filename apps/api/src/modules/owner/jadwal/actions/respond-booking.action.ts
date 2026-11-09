import { Tx } from "../../../../db/client";
import { createScheduleAction } from "./create-schedule.action";
import type { BookingRecord, RespondBookingInput } from "../jadwal.types";

/**
 * Menyetujui atau menolak permintaan booking pelanggan.
 * Jika disetujui, otomatis dibuatkan entri schedule dan disinkronkan ke Google Calendar.
 */
export async function respondBookingAction(
  tx: Tx,
  ownerId: string,
  input: RespondBookingInput
): Promise<BookingRecord> {
  const existing = await tx<BookingRecord[]>`
    SELECT id, owner_id, customer_name, customer_phone, service_name,
           requested_start_at, requested_end_at, status, schedule_id, notes,
           created_at, updated_at
    FROM bookings
    WHERE id = ${input.bookingId} AND owner_id = ${ownerId}
    LIMIT 1;
  `;

  if (existing.length === 0) {
    throw new Error("Data booking tidak ditemukan.");
  }

  const booking = existing[0]!;

  if (input.action === "reject") {
    const updated = await tx<BookingRecord[]>`
      UPDATE bookings
      SET status = 'rejected',
          notes = COALESCE(${input.notes || null}, notes),
          updated_at = now()
      WHERE id = ${input.bookingId} AND owner_id = ${ownerId}
      RETURNING *;
    `;
    return updated[0]!;
  }

  // Jika Approve, buat schedule resmi
  const scheduleTitle = `${booking.service_name} - ${booking.customer_name}`;
  const schedule = await createScheduleAction(tx, ownerId, {
    title: scheduleTitle,
    start_at: new Date(booking.requested_start_at).toISOString(),
    end_at: new Date(booking.requested_end_at).toISOString(),
    source: "booking",
    description: `Booking dari ${booking.customer_name} (${booking.customer_phone}). Catatan: ${booking.notes || "-"}`,
  });

  const updated = await tx<BookingRecord[]>`
    UPDATE bookings
    SET status = 'approved',
        schedule_id = ${schedule.id},
        updated_at = now()
    WHERE id = ${input.bookingId} AND owner_id = ${ownerId}
    RETURNING *;
  `;

  return updated[0]!;
}
