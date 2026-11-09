import { Tx } from "../../../../db/client";
import type { BookingRecord, BookingStatus } from "../jadwal.types";

/**
 * Mengambil daftar permintaan booking / janji temu pelanggan.
 * Memeriksa potensi collision dengan agenda yang sudah terkonfirmasi.
 */
export async function listBookingsAction(
  tx: Tx,
  ownerId: string,
  statusFilter?: BookingStatus
): Promise<BookingRecord[]> {
  const rows = statusFilter
    ? await tx<BookingRecord[]>`
        SELECT b.id, b.owner_id, b.customer_name, b.customer_phone, b.service_name,
               b.requested_start_at, b.requested_end_at, b.status, b.schedule_id, b.notes,
               b.created_at, b.updated_at,
               EXISTS (
                 SELECT 1 FROM schedules s
                 WHERE s.owner_id = b.owner_id
                   AND s.status = 'confirmed'
                   AND tstzrange(s.start_at, s.end_at, '[)') && tstzrange(b.requested_start_at, b.requested_end_at, '[)')
               ) AS has_collision
        FROM bookings b
        WHERE b.owner_id = ${ownerId} AND b.status = ${statusFilter}
        ORDER BY b.requested_start_at ASC
        LIMIT 100;
      `
    : await tx<BookingRecord[]>`
        SELECT b.id, b.owner_id, b.customer_name, b.customer_phone, b.service_name,
               b.requested_start_at, b.requested_end_at, b.status, b.schedule_id, b.notes,
               b.created_at, b.updated_at,
               EXISTS (
                 SELECT 1 FROM schedules s
                 WHERE s.owner_id = b.owner_id
                   AND s.status = 'confirmed'
                   AND tstzrange(s.start_at, s.end_at, '[)') && tstzrange(b.requested_start_at, b.requested_end_at, '[)')
               ) AS has_collision
        FROM bookings b
        WHERE b.owner_id = ${ownerId}
        ORDER BY b.requested_start_at ASC
        LIMIT 100;
      `;

  return rows;
}
