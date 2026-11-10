import { describe, it, expect } from "bun:test";
import { ScheduleTimeParser } from "../../src/modules/chat/pipeline/schedule-time.parser";
import { ScheduleHallucinationInterceptor } from "../../src/modules/chat/pipeline/schedule-hallucination.interceptor";
import { GoogleCalendarClient } from "../../src/adapters/google-calendar/google-calendar.client";

describe("Schedule Integration & Parser Tests", () => {
  it("1. ScheduleTimeParser.extractHourMinute parses Indonesian hour formats", () => {
    const t1 = ScheduleTimeParser.extractHourMinute("jadwalkan rapat jam 10 pagi");
    expect(t1).not.toBeNull();
    expect(t1?.hour).toBe(10);
    expect(t1?.minute).toBe(0);

    const t2 = ScheduleTimeParser.extractHourMinute("meeting pukul 14.30");
    expect(t2).not.toBeNull();
    expect(t2?.hour).toBe(14);
    expect(t2?.minute).toBe(30);

    const t3 = ScheduleTimeParser.extractHourMinute("ketemu jam 7 malam");
    expect(t3).not.toBeNull();
    expect(t3?.hour).toBe(19);
    expect(t3?.minute).toBe(0);

    const t4 = ScheduleTimeParser.extractHourMinute("pesan slot 15:45 WIB");
    expect(t4).not.toBeNull();
    expect(t4?.hour).toBe(15);
    expect(t4?.minute).toBe(45);
  });

  it("2. ScheduleTimeParser parses natural Indonesian sentences with 'tujuannya'", () => {
    const ref = new Date("2026-11-09T10:00:00Z"); // Senin 9 Nov 2026
    const parsed1 = ScheduleTimeParser.parseDateTimeRange("Besok jam 8 malam tujuannya test 3", ref);

    expect(parsed1).not.toBeNull();
    expect(parsed1?.extractedTitle?.toLowerCase()).toBe("test 3");
    const d1 = new Date(parsed1!.startAt);
    expect(d1.getHours()).toBe(20);

    const parsed2 = ScheduleTimeParser.parseDateTimeRange("Besok jam 7 pagi tujuannya test 4", ref);
    expect(parsed2).not.toBeNull();
    expect(parsed2?.extractedTitle?.toLowerCase()).toBe("test 4");
    const d2 = new Date(parsed2!.startAt);
    expect(d2.getHours()).toBe(7);
  });

  it("3. ScheduleTimeParser returns null when no time is specified", () => {
    const parsed = ScheduleTimeParser.parseDateTimeRange("halo selamat pagi mau tanya produk");
    expect(parsed).toBeNull();
  });

  it("4. ScheduleHallucinationInterceptor detects raw JSON schedule leak and recovers candidate", () => {
    const wildAiReply = `Siap Bos! EnBee telah mencatat booking baru besok, Selasa 10 November 2026, pukul 20.00 WIB dengan tujuan test 3. Agenda ini sudah disinkronkan ke Google Calendar, lengkap dengan format JSON resmi berikut:

\`\`\`json
{
  "schedule": [
    {
      "date": "2026-11-10",
      "time": "20:00 WIB",
      "purpose": "test 3"
    }
  ]
}
\`\`\``;

    const userMessage = "Besok jam 8 malam tujuannya test 3";
    const result = ScheduleHallucinationInterceptor.inspectAndRecover(wildAiReply, userMessage);

    expect(result.hasHallucination).toBe(true);
    expect(result.sanitizedReply).not.toContain("```json");
    expect(result.sanitizedReply).not.toContain('"schedule"');
    expect(result.candidate).toBeDefined();
    expect(result.candidate?.title).toBe("test 3");
    expect(result.candidate?.startAt).toBeDefined();
  });

  it("5. ScheduleHallucinationInterceptor ignores clean normal replies", () => {
    const normalReply = "Halo Bos! Selamat siang, ada yang bisa EnBee bantu untuk usaha hari ini?";
    const userMessage = "Halo EnBee";
    const result = ScheduleHallucinationInterceptor.inspectAndRecover(normalReply, userMessage);

    expect(result.hasHallucination).toBe(false);
    expect(result.sanitizedReply).toBe(normalReply);
    expect(result.candidate).toBeUndefined();
  });

  it("6. GoogleCalendarClient returns empty array or null gracefully when unconfigured", async () => {
    const dummyTx: any = async () => [];
    const token = await GoogleCalendarClient.getValidAccessToken(dummyTx, "00000000-0000-0000-0000-000000000000");
    expect(token).toBeNull();

    const events = await GoogleCalendarClient.listCalendarEvents(dummyTx, "00000000-0000-0000-0000-000000000000", "2026-11-01T00:00:00Z", "2026-11-30T00:00:00Z");
    expect(events).toEqual([]);

    const busy = await GoogleCalendarClient.queryFreeBusy(dummyTx, "00000000-0000-0000-0000-000000000000", "2026-11-01T00:00:00Z", "2026-11-30T00:00:00Z");
    expect(busy).toEqual([]);
  });
});
