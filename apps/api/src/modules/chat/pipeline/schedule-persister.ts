import { withOwnerContext, withSystemContext } from "../../../db/client";
import { createModuleLogger } from "../../../logs";
import { createScheduleAction } from "../../owner/jadwal/actions/create-schedule.action";
import { deleteScheduleAction } from "../../owner/jadwal/actions/delete-schedule.action";
import type { AiExtractionResult, AiScheduleItem } from "../../../adapters/ai/types";
import type { ChannelOwnerResolution } from "./owner-resolver";
import type { InboundMessageInput } from "../chat.schema";

const schedLogger = createModuleLogger("chat-schedule-persister");

/**
 * SchedulePersister:
 * Bertindak sebagai Tool Executor (konsep MCP / Tool Execution) yang mengeksekusi
 * instruksi penjadwalan terstruktur dari hasil inferensi AI secara otomatis ke
 * PostgreSQL dan Google Calendar API.
 */
export class SchedulePersister {
  /**
   * Menormalkan ISO string atau WIB date string menjadi ISO UTC valid.
   */
  private static normalizeDateTime(dtStr: string): { startAt: string; endAt: string } | null {
    try {
      let start = new Date(dtStr);
      if (isNaN(start.getTime())) {
        return null;
      }

      // Default durasi adalah 1 jam
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      return {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Mengeksekusi aksi penjadwalan yang diekstraksi oleh AI.
   */
  static async persistSchedule(
    owner: ChannelOwnerResolution,
    payload: InboundMessageInput,
    persona: "assistant" | "admin",
    isOwner: boolean,
    aiResult: AiExtractionResult
  ): Promise<boolean> {
    const sched = aiResult.schedule;
    if (!sched || sched.action === "none") {
      return false;
    }

    // 1. Eksekusi untuk Owner (Asisten Internal) -> Simpan ke Kalender Usaha & Google Calendar
    if (isOwner) {
      return await withOwnerContext(owner.owner_id, owner.user_id, async (tx) => {
        if (sched.action === "create" && sched.start_at) {
          const normalized = this.normalizeDateTime(sched.start_at);
          if (!normalized) {
            schedLogger.warn("Format start_at jadwal tidak valid dari AI", { start_at: sched.start_at });
            return false;
          }

          const startAt = normalized.startAt;
          const endAt = sched.end_at ? new Date(sched.end_at).toISOString() : normalized.endAt;
          const title = sched.title?.trim() || "Agenda Usaha";

          try {
            await createScheduleAction(tx, owner.owner_id, {
              title,
              start_at: startAt,
              end_at: endAt,
              source: "chat",
              description: sched.notes,
            });

            schedLogger.info(`Jadwal "${title}" berhasil disimpan ke DB & Google Calendar via AI Tool Action`, {
              ownerId: owner.owner_id,
              startAt,
              endAt,
            });
            return true;
          } catch (err: any) {
            schedLogger.error(`Gagal menyimpan jadwal via createScheduleAction: ${err.message}`, err);
            return false;
          }
        }

        if (sched.action === "delete") {
          try {
            // Cari agenda aktif terdekat yang cocok dengan judul atau agenda mendatang terdekat
            let targetScheduleId: string | null = null;
            if (sched.title) {
              const matches = await tx<{ id: string; title: string }[]>`
                SELECT id, title
                FROM schedules
                WHERE owner_id = ${owner.owner_id}
                  AND status = 'confirmed'
                  AND end_at >= now()
                  AND title ILIKE ${`%${sched.title.trim()}%`}
                ORDER BY start_at ASC
                LIMIT 1;
              `;
              if (matches[0]) {
                targetScheduleId = matches[0].id;
              }
            }

            if (!targetScheduleId) {
              const upcoming = await tx<{ id: string; title: string }[]>`
                SELECT id, title
                FROM schedules
                WHERE owner_id = ${owner.owner_id}
                  AND status = 'confirmed'
                  AND end_at >= now()
                ORDER BY start_at ASC
                LIMIT 1;
              `;
              if (upcoming[0]) {
                targetScheduleId = upcoming[0].id;
              }
            }

            if (targetScheduleId) {
              await deleteScheduleAction(tx, owner.owner_id, targetScheduleId);
              schedLogger.info(`Jadwal ${targetScheduleId} berhasil dihapus via AI Tool Action`, {
                ownerId: owner.owner_id,
              });
              return true;
            }
          } catch (err: any) {
            schedLogger.error(`Gagal menghapus jadwal via deleteScheduleAction: ${err.message}`, err);
          }
        }

        return false;
      });
    }

    // 2. Eksekusi untuk Pelanggan (Admin Persona) -> Masukkan ke Permintaan Booking (bookings table)
    if (sched.action === "create" && sched.start_at) {
      const normalized = this.normalizeDateTime(sched.start_at);
      if (!normalized) return false;

      return await withSystemContext(async (tx) => {
        try {
          const customerName = payload.sender_name || payload.sender_id || "Pelanggan";
          const customerPhone = payload.sender_id || "-";
          const serviceName = sched.title?.trim() || "Layanan Toko";

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
              ${normalized.startAt}::timestamptz,
              ${normalized.endAt}::timestamptz,
              ${sched.notes || payload.text || serviceName},
              'pending'
            );
          `;

          schedLogger.info(`Permintaan booking pelanggan "${serviceName}" berhasil disimpan ke bookings via AI Tool Action`, {
            ownerId: owner.owner_id,
            customerName,
          });
          return true;
        } catch (err: any) {
          schedLogger.error(`Gagal mencatat booking pelanggan: ${err.message}`, err);
          return false;
        }
      });
    }

    return false;
  }
}
