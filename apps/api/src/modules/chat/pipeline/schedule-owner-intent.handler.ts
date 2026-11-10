import { withOwnerContext } from "../../../db/client";
import { getGoogleStatusAction } from "../../owner/jadwal/actions/get-google-status.action";
import { ScheduleTimeParser } from "./schedule-time.parser";
import { formatIndoDateRange } from "./schedule-format.util";
import type { ChannelOwnerResolution } from "./owner-resolver";

export class ScheduleOwnerIntentHandler {
  /**
   * Menangani permintaan pembuatan / penghapusan jadwal baru dari Owner via chat.
   */
  static async handle(
    owner: ChannelOwnerResolution,
    message: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    const isDelete = /(hapus jadwal|batalkan jadwal|cancel jadwal|batalin jadwal|delete jadwal)/i.test(message);
    const parsedTime = ScheduleTimeParser.parseDateTimeRange(message);
    const hasSchedKeywords = /(jadwalkan|agendakan|bikin jadwal|atur jadwal|buat jadwal|tambah jadwal|tujuannya|booking|agenda)\b/i.test(message);
    const isCreate = hasSchedKeywords || Boolean(parsedTime);

    if (!isDelete && !isCreate) {
      return { handled: false };
    }

    return await withOwnerContext(owner.owner_id, owner.user_id, async (tx) => {
      // 1. Verifikasi Status Koneksi Google Calendar Terlebih Dahulu
      const googleStatus = await getGoogleStatusAction(tx, owner.owner_id);
      if (!googleStatus.connected || !googleStatus.hasCalendarScope) {
        return {
          handled: true,
          replyText: `⚠️ *Google Calendar Belum Aktif*\n\nHalo Bos! Tolong aktifkan Google Calendar dulu melalui menu *Jadwal* atau *Kanal* di dashboard web agar sistem dapat menyinkronkan agenda Anda ya Bos. 🙏`,
        };
      }

      if (isDelete) {
        const schedules = await tx<{ id: string; title: string; start_at: Date; end_at: Date }[]>`
          SELECT id, title, start_at, end_at
          FROM schedules
          WHERE owner_id = ${owner.owner_id} AND status = 'confirmed' AND end_at >= now()
          ORDER BY start_at ASC
          LIMIT 1;
        `;

        const s = schedules[0];
        if (!s) {
          return {
            handled: true,
            replyText: "Mohon maaf Bos, saya tidak menemukan agenda aktif terdekat yang dapat dibatalkan di kalender Anda.",
          };
        }

        await tx`
          INSERT INTO pending_actions (owner_id, type, payload, status, expires_at)
          VALUES (
            ${owner.owner_id},
            'delete_schedule',
            ${JSON.stringify({ schedule_id: s.id, title: s.title, start_at: s.start_at, end_at: s.end_at })},
            'pending',
            now() + interval '15 minutes'
          );
        `;

        const range = formatIndoDateRange(s.start_at.toISOString(), s.end_at.toISOString());
        return {
          handled: true,
          replyText: `🗑️ *Konfirmasi Hapus Jadwal*\n\nApakah Bos yakin ingin membatalkan/menghapus agenda berikut?\n• Acara: ${s.title}\n• Waktu: ${range}\n\n👉 Ketik *Ya* untuk menghapus atau *Batal* untuk mempertahankan.`,
        };
      }

      // Pembuatan Jadwal Baru: Parse waktu dan judul
      const parsed = parsedTime || ScheduleTimeParser.parseDateTimeRange(message);
      if (!parsed) {
        return {
          handled: true,
          replyText: "Mohon maaf Bos, tanggal atau jam agendanya belum terdeteksi jelas. Contoh: *'Jadwalkan rapat evaluasi besok jam 14.00'*. Mohon ketik kembali ya Bos.",
        };
      }

      // Periksa bentrok GiST
      const conflictCheck = await tx<{ fn_check_conflict: boolean }[]>`
        SELECT fn_check_conflict(${owner.owner_id}, ${parsed.startAt}::timestamptz, ${parsed.endAt}::timestamptz);
      `;

      if (conflictCheck[0]?.fn_check_conflict) {
        return {
          handled: true,
          replyText: `⚠️ *Peringatan Jadwal Bentrok*\n\nSlot waktu tersebut bertabrakan dengan agenda lain yang sudah ada di kalender Anda. Silakan pilih jam atau hari lain ya Bos.`,
        };
      }

      // Simpan draf ke pending_actions
      await tx`
        INSERT INTO pending_actions (owner_id, type, payload, status, expires_at)
        VALUES (
          ${owner.owner_id},
          'create_schedule',
          ${JSON.stringify({ title: parsed.extractedTitle, start_at: parsed.startAt, end_at: parsed.endAt, source: 'chat' })},
          'pending',
          now() + interval '15 minutes'
        );
      `;

      const rangeStr = formatIndoDateRange(parsed.startAt, parsed.endAt);
      return {
        handled: true,
        replyText: `📅 *Konfirmasi Draf Jadwal*\n\n• Acara: ${parsed.extractedTitle}\n• Waktu: ${rangeStr}\n\nApakah Bos ingin saya simpan ke Google Calendar?\n👉 Ketik *Ya* untuk konfirmasi atau *Batal* untuk membatalkan.`,
      };
    });
  }
}
