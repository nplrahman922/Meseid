import { withSystemContext } from "../../../db/client";
import { ScheduleTimeParser } from "./schedule-time.parser";
import { formatIndoDateRange } from "./schedule-format.util";
import type { InboundMessageInput } from "../chat.schema";
import type { ChannelOwnerResolution } from "./owner-resolver";

export class ScheduleCustomerBookingHandler {
  /**
   * Menangani permintaan booking dari Pelanggan umum (Customer).
   */
  static async handle(
    owner: ChannelOwnerResolution,
    payload: InboundMessageInput,
    userMessage: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    const isBooking = /(booking|reservasi|janji temu|pesan slot|jadwal temu|mau buat janji)/i.test(userMessage);
    if (!isBooking) {
      return { handled: false };
    }

    const parsed = ScheduleTimeParser.parseDateTimeRange(userMessage);
    if (!parsed) {
      return {
        handled: true,
        replyText: `Halo kak! Untuk reservasi atau janji temu, mohon sertakan hari dan jam yang diinginkan ya (contoh: *'Mau booking konsultasi besok jam 10 pagi'*). Terima kasih! 🙏`,
      };
    }

    return await withSystemContext(async (tx) => {
      // Periksa tabrakan jadwal
      const conflictCheck = await tx<{ fn_check_conflict: boolean }[]>`
        SELECT fn_check_conflict(${owner.owner_id}, ${parsed.startAt}::timestamptz, ${parsed.endAt}::timestamptz);
      `;

      if (conflictCheck[0]?.fn_check_conflict) {
        return {
          handled: true,
          replyText: `Halo kak! Mohon maaf sekali, slot waktu yang kakak pilih sudah terisi agenda lain. Sebagai alternatif, slot jam 13.00 - 14.00 atau 15.00 - 16.00 masih tersedia. Apakah kakak berkenan di waktu alternatif tersebut? 🙏`,
        };
      }

      const customerName = payload.sender_name || payload.sender_id || "Pelanggan";
      const customerPhone = payload.sender_id || "-";
      const serviceName = parsed.extractedTitle || "Layanan Toko";

      await tx`
        INSERT INTO bookings (
          owner_id,
          customer_name,
          customer_phone,
          service_name,
          requested_start_at,
          requested_end_at,
          notes,
          status
        )
        VALUES (
          ${owner.owner_id},
          ${customerName},
          ${customerPhone},
          ${serviceName},
          ${parsed.startAt}::timestamptz,
          ${parsed.endAt}::timestamptz,
          ${userMessage},
          'pending'
        );
      `;

      const rangeStr = formatIndoDateRange(parsed.startAt, parsed.endAt);
      return {
        handled: true,
        replyText: `Halo kak ${customerName}! Permintaan janji temu kakak telah kami catat:\n• Layanan: ${serviceName}\n• Waktu: ${rangeStr}\n\nPermintaan ini sedang menunggu konfirmasi dari tim kami. Kami akan segera menghubungi kakak kembali. Terima kasih! 🙏`,
      };
    });
  }
}
