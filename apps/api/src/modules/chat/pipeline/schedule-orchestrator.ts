import { withOwnerContext, withSystemContext } from "../../../db/client";
import { createScheduleAction } from "../../owner/jadwal/actions/create-schedule.action";
import { deleteScheduleAction } from "../../owner/jadwal/actions/delete-schedule.action";
import { ScheduleTimeParser } from "./schedule-time.parser";
import { createModuleLogger } from "../../../logs";
import type { InboundMessageInput } from "../chat.schema";
import type { ChannelOwnerResolution } from "./owner-resolver";

const schedLogger = createModuleLogger("chat-schedule-orchestrator");

function formatIndoDateRange(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const dateStr = s.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const sTime = s.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const eTime = e.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    return `${dateStr}, ${sTime} - ${eTime} WIB`;
  } catch {
    return `${startIso} s/d ${endIso}`;
  }
}

export class ScheduleOrchestrator {
  /**
   * Menangani jawaban konfirmasi dari Owner atas draf pending action.
   */
  static async handleOwnerConfirmation(
    owner: ChannelOwnerResolution,
    message: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    const normalized = message.trim().toLowerCase();

    // Jika pesan mengandung perintah aksi eksplisit (seperti batalkan jadwal...), serahkan ke handleOwnerIntent
    if (/(hapus jadwal|batalkan jadwal|cancel jadwal|batalin jadwal|delete jadwal|jadwalkan|agendakan|bikin jadwal)/i.test(message)) {
      return { handled: false };
    }

    const isYes = /^(ya|iya|y|oke|ok|siap|konfirmasi|setuju|simpan|yes|deal|lanjutkan|benar|betul)\b/i.test(normalized);
    const isNo = /^(batal|batalkan|jangan|tidak|nggak|gak|batalin|cancel|no|bukan)\b/i.test(normalized);

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
          return {
            handled: true,
            replyText: `⚠️ *Gagal Menghapus Jadwal*: ${err.message}`,
          };
        }
      }

      return { handled: false };
    });
  }

  /**
   * Menangani permintaan pembuatan / penghapusan jadwal baru dari Owner via chat.
   */
  static async handleOwnerIntent(
    owner: ChannelOwnerResolution,
    message: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    const isDelete = /(hapus jadwal|batalkan jadwal|cancel jadwal|batalin jadwal|delete jadwal)/i.test(message);
    const isCreate = /(jadwalkan|agendakan|bikin jadwal|atur jadwal|buat jadwal|tambah jadwal)\b/i.test(message);

    if (!isDelete && !isCreate) {
      return { handled: false };
    }

    return await withOwnerContext(owner.owner_id, owner.user_id, async (tx) => {
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
            ${{ schedule_id: s.id, title: s.title, start_at: s.start_at, end_at: s.end_at }},
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
      const parsed = ScheduleTimeParser.parseDateTimeRange(message);
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
          ${{ title: parsed.extractedTitle, start_at: parsed.startAt, end_at: parsed.endAt, source: 'chat' }},
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

  /**
   * Menangani permintaan booking dari Pelanggan umum (Customer).
   */
  static async handleCustomerBooking(
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
