import { withOwnerContext } from "../../../db/client";
import { getGoogleStatusAction } from "../../owner/jadwal/actions/get-google-status.action";
import { ScheduleTimeParser } from "./schedule-time.parser";
import { formatIndoDateRange } from "./schedule-format.util";
import { createModuleLogger } from "../../../logs";
import type { ChannelOwnerResolution } from "./owner-resolver";

const interceptorLogger = createModuleLogger("schedule-hallucination-interceptor");

export interface InterceptedScheduleCandidate {
  title: string;
  startAt: string;
  endAt: string;
}

export interface HallucinationCheckResult {
  hasHallucination: boolean;
  sanitizedReply: string;
  candidate?: InterceptedScheduleCandidate;
}

export class ScheduleHallucinationInterceptor {
  /**
   * Menganalisis dan mengekstrak kandidat jadwal dari teks balasan AI yang berhalusinasi.
   */
  static inspectAndRecover(aiReply: string, userMessage: string): HallucinationCheckResult {
    const jsonMatch = aiReply.match(/```(?:json)?\s*(\{[\s\S]*?"schedule"[\s\S]*?\})\s*```/i) ||
                      aiReply.match(/(\{[\s\S]*?"schedule"\s*:\s*\[[\s\S]*?\]\s*\})/i);

    const hasClaim = /(?:telah|sudah)\s+(?:dicatat|disinkronkan|dimasukkan|sinkron)\s+ke\s+google\s+calendar/i.test(aiReply);

    if (!jsonMatch && !hasClaim) {
      return {
        hasHallucination: false,
        sanitizedReply: aiReply,
      };
    }

    interceptorLogger.warn("Terdeteksi halusinasi jadwal atau blok JSON liar pada balasan AI, memulai interceptor", {
      hasJson: Boolean(jsonMatch),
      hasClaim,
    });

    let candidate: InterceptedScheduleCandidate | undefined;

    // 1. Ekstraksi kandidat dari blok JSON yang dibuat AI
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const list = Array.isArray(parsed.schedule) ? parsed.schedule : [parsed];
        const lastItem = list[list.length - 1];
        if (lastItem) {
          const rawText = `${lastItem.date || ""} ${lastItem.time || ""} ${lastItem.purpose || lastItem.title || ""}`;
          const timeRange = ScheduleTimeParser.parseDateTimeRange(rawText);
          if (timeRange) {
            candidate = {
              title: lastItem.purpose || lastItem.title || timeRange.extractedTitle || "Agenda Usaha",
              startAt: timeRange.startAt,
              endAt: timeRange.endAt,
            };
          }
        }
      } catch (err: any) {
        interceptorLogger.warn("Gagal parse blok JSON halusinasi AI:", { error: err.message });
      }
    }

    // 2. Fallback: Ekstraksi langsung dari pesan user
    if (!candidate) {
      const parsedFromUser = ScheduleTimeParser.parseDateTimeRange(userMessage);
      if (parsedFromUser) {
        candidate = {
          title: parsedFromUser.extractedTitle || "Agenda Usaha",
          startAt: parsedFromUser.startAt,
          endAt: parsedFromUser.endAt,
        };
      }
    }

    // 3. Bersihkan blok JSON dari teks balasan
    const sanitizedReply = aiReply
      .replace(/```(?:json)?\s*\{[\s\S]*?"schedule"[\s\S]*?\}\s*```/gi, "")
      .replace(/\{[\s\S]*?"schedule"\s*:\s*\[[\s\S]*?\]\s*\}/gi, "")
      .trim();

    return {
      hasHallucination: true,
      sanitizedReply,
      candidate,
    };
  }

  /**
   * Menangani intervensi database dan konfirmasi jika balasan AI berhalusinasi.
   */
  static async handle(
    owner: ChannelOwnerResolution,
    aiReply: string,
    userMessage: string
  ): Promise<{ intercepted: boolean; replyText: string }> {
    const check = this.inspectAndRecover(aiReply, userMessage);
    if (!check.hasHallucination) {
      return { intercepted: false, replyText: aiReply };
    }

    return await withOwnerContext(owner.owner_id, owner.user_id, async (tx) => {
      // 1. Verifikasi koneksi Google Calendar
      const googleStatus = await getGoogleStatusAction(tx, owner.owner_id);
      if (!googleStatus.connected || !googleStatus.hasCalendarScope) {
        return {
          intercepted: true,
          replyText: `⚠️ *Google Calendar Belum Aktif*\n\nHalo Bos! Tolong aktifkan Google Calendar dulu melalui menu *Jadwal* atau *Kanal* di dashboard web agar sistem dapat menyinkronkan agenda Anda ya Bos. 🙏`,
        };
      }

      // 2. Jika ada kandidat jadwal valid, simpan ke pending_actions sebagai draf
      if (check.candidate) {
        const conflictCheck = await tx<{ fn_check_conflict: boolean }[]>`
          SELECT fn_check_conflict(${owner.owner_id}, ${check.candidate.startAt}::timestamptz, ${check.candidate.endAt}::timestamptz);
        `;

        if (conflictCheck[0]?.fn_check_conflict) {
          return {
            intercepted: true,
            replyText: `⚠️ *Peringatan Jadwal Bentrok*\n\nSlot waktu tersebut bertabrakan dengan agenda lain di kalender usaha Anda. Silakan pilih jam atau hari lain ya Bos.`,
          };
        }

        await tx`
          INSERT INTO pending_actions (owner_id, type, payload, status, expires_at)
          VALUES (
            ${owner.owner_id},
            'create_schedule',
            ${JSON.stringify({ title: check.candidate.title, start_at: check.candidate.startAt, end_at: check.candidate.endAt, source: 'chat' })},
            'pending',
            now() + interval '15 minutes'
          );
        `;

        const rangeStr = formatIndoDateRange(check.candidate.startAt, check.candidate.endAt);
        return {
          intercepted: true,
          replyText: `📅 *Konfirmasi Draf Jadwal*\n\n• Acara: ${check.candidate.title}\n• Waktu: ${rangeStr}\n\nApakah Bos ingin saya simpan ke Google Calendar?\n👉 Ketik *Ya* untuk konfirmasi atau *Batal* untuk membatalkan.`,
        };
      }

      return {
        intercepted: true,
        replyText: check.sanitizedReply || "Siap Bos! Ada rincian waktu dan tujuan agenda yang ingin ditambahkan?",
      };
    });
  }
}
