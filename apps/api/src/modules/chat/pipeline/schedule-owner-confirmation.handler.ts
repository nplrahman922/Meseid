import { withOwnerContext } from "../../../db/client";
import { createScheduleAction } from "../../owner/jadwal/actions/create-schedule.action";
import { deleteScheduleAction } from "../../owner/jadwal/actions/delete-schedule.action";
import { formatIndoDateRange } from "./schedule-format.util";
import { createModuleLogger } from "../../../logs";
import type { ChannelOwnerResolution } from "./owner-resolver";

const confirmLogger = createModuleLogger("schedule-owner-confirmation");

export class ScheduleOwnerConfirmationHandler {
  /**
   * Menangani jawaban konfirmasi dari Owner atas draf pending action (Ya / Batal).
   */
  static async handle(
    owner: ChannelOwnerResolution,
    message: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    const normalized = message.trim().toLowerCase();

    // Jika pesan mengandung perintah aksi penjadwalan eksplisit, serahkan ke handleOwnerIntent
    if (/(hapus jadwal|batalkan jadwal|cancel jadwal|batalin jadwal|delete jadwal|jadwalkan|agendakan|bikin jadwal|atur jadwal|buat jadwal|booking|pesan jadwal)/i.test(message)) {
      if (!/^(batal|batalkan|cancel|batalin)[.!]?$/i.test(normalized)) {
        return { handled: false };
      }
    }

    const isYes = /^(ya|iya|y|oke|ok|siap|siap bos|konfirmasi|setuju|simpan|yes|deal|lanjutkan|benar|betul|ok simpan|ya simpan)[.!]?$/i.test(normalized);
    const isNo = /^(batal|batalkan|jangan|tidak|nggak|gak|batalin|cancel|no|bukan)[.!]?$/i.test(normalized);

    if (!isYes && !isNo) {
      return { handled: false };
    }

    return await withOwnerContext(owner.owner_id, owner.user_id, async (tx) => {
      const actions = await tx<{
        id: string;
        type: string;
        payload: any;
        expires_at: Date;
      }[]>`
        SELECT id, type, payload, expires_at
        FROM pending_actions
        WHERE owner_id = ${owner.owner_id}
          AND status = 'pending'
          AND type IN ('create_schedule', 'delete_schedule')
          AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1;
      `;

      const action = actions[0];
      if (!action) {
        return { handled: false };
      }

      if (isNo) {
        await tx`
          UPDATE pending_actions
          SET status = 'cancelled', updated_at = now()
          WHERE id = ${action.id};
        `;
        return {
          handled: true,
          replyText: "❌ *Aksi Dibatalkan*\n\nTidak ada perubahan yang dilakukan pada Google Calendar maupun jadwal usaha Anda.",
        };
      }

      // Owner menjawab "Ya" / Konfirmasi
      if (action.type === "create_schedule") {
        const payload = typeof action.payload === "string" ? JSON.parse(action.payload) : action.payload;
        try {
          await createScheduleAction(tx, owner.owner_id, {
            title: payload.title,
            start_at: payload.start_at,
            end_at: payload.end_at,
            source: "chat",
            description: payload.description,
          });

          await tx`
            UPDATE pending_actions
            SET status = 'confirmed', updated_at = now()
            WHERE id = ${action.id};
          `;

          const rangeStr = formatIndoDateRange(payload.start_at, payload.end_at);
          return {
            handled: true,
            replyText: `✅ *Jadwal Berhasil Dikonfirmasi & Disimpan!*\n\n• Acara: ${payload.title}\n• Waktu: ${rangeStr}\n\nAgenda telah masuk ke Google Calendar dan jadwal usaha Anda. 👍`,
          };
        } catch (err: any) {
          confirmLogger.error("Gagal menyimpan jadwal dari konfirmasi owner", err);
          return {
            handled: true,
            replyText: `⚠️ *Gagal Menyimpan Jadwal*: ${err.message}`,
          };
        }
      }

      if (action.type === "delete_schedule") {
        const payload = typeof action.payload === "string" ? JSON.parse(action.payload) : action.payload;
        try {
          await deleteScheduleAction(tx, owner.owner_id, payload.schedule_id);

          await tx`
            UPDATE pending_actions
            SET status = 'confirmed', updated_at = now()
            WHERE id = ${action.id};
          `;

          return {
            handled: true,
            replyText: `✅ *Jadwal Berhasil Dihapus!*\n\nAgenda "${payload.title}" telah dibatalkan dari Google Calendar dan kalender usaha Anda.`,
          };
        } catch (err: any) {
          confirmLogger.error("Gagal menghapus jadwal dari konfirmasi owner", err);
          return {
            handled: true,
            replyText: `⚠️ *Gagal Menghapus Jadwal*: ${err.message}`,
          };
        }
      }

      return { handled: false };
    });
  }
}
