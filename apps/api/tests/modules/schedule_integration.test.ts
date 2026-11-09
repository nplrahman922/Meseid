import { describe, it, expect } from "bun:test";
import { ScheduleTimeParser } from "../../src/modules/chat/pipeline/schedule-time.parser";
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

  it("2. ScheduleTimeParser.parseDateTimeRange parses relative dates (besok, lusa)", () => {
    const ref = new Date("2026-11-10T02:00:00Z"); // Selasa 10 Nov 2026
    const parsed = ScheduleTimeParser.parseDateTimeRange("atur jadwal evaluasi tim besok jam 14.00", ref);

    expect(parsed).not.toBeNull();
    expect(parsed?.startAt).toBeDefined();
    expect(parsed?.endAt).toBeDefined();
    expect(parsed?.extractedTitle).toContain("evaluasi tim");

    const start = new Date(parsed!.startAt);
    const end = new Date(parsed!.endAt);
    expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000); // 1 jam durasi default
  });

  it("3. ScheduleTimeParser returns null when no time is specified", () => {
    const parsed = ScheduleTimeParser.parseDateTimeRange("halo selamat pagi mau tanya produk");
    expect(parsed).toBeNull();
  });

  it("4. GoogleCalendarClient returns empty array or null gracefully when unconfigured", async () => {
    const dummyTx: any = async () => [];
    const token = await GoogleCalendarClient.getValidAccessToken(dummyTx, "00000000-0000-0000-0000-000000000000");
    expect(token).toBeNull();

    const events = await GoogleCalendarClient.listCalendarEvents(dummyTx, "00000000-0000-0000-0000-000000000000", "2026-11-01T00:00:00Z", "2026-11-30T00:00:00Z");
    expect(events).toEqual([]);

    const busy = await GoogleCalendarClient.queryFreeBusy(dummyTx, "00000000-0000-0000-0000-000000000000", "2026-11-01T00:00:00Z", "2026-11-30T00:00:00Z");
    expect(busy).toEqual([]);
  });
});
