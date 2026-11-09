import { describe, it, expect } from "bun:test";
import { OperatingHoursEvaluator } from "../../src/modules/chat/pipeline/operating-hours.evaluator";
import { getDefaultBusinessHours } from "../../src/modules/owner/jam-operasional/jam-operasional.types";

describe("Jam Operasional & Operating Hours Evaluator Tests", () => {
  it("1. normalizeTime converts various formats to standard HH:mm", () => {
    expect(OperatingHoursEvaluator.normalizeTime("08:00")).toBe("08:00");
    expect(OperatingHoursEvaluator.normalizeTime("08.00 WIB")).toBe("08:00");
    expect(OperatingHoursEvaluator.normalizeTime("8:30")).toBe("08:30");
    expect(OperatingHoursEvaluator.normalizeTime("20.00")).toBe("20:00");
    expect(OperatingHoursEvaluator.normalizeTime(null)).toBe(null);
    expect(OperatingHoursEvaluator.normalizeTime("invalid")).toBe(null);
  });

  it("2. getLocalTimeParts calculates correct day and time for Asia/Jakarta (WIB)", () => {
    // 2026-10-20 03:00:00 UTC = 2026-10-20 10:00:00 WIB (Selasa)
    const testDate = new Date("2026-10-20T03:00:00Z");
    const parts = OperatingHoursEvaluator.getLocalTimeParts(testDate, "Asia/Jakarta");

    expect(parts.dateStr).toBe("2026-10-20");
    expect(parts.dayId).toBe("tue");
    expect(parts.timeStr).toBe("10:00");
  });

  it("3. getDefaultBusinessHours returns complete fallback structure with 7 days", () => {
    const defaults = getDefaultBusinessHours("Warung Sederhana");
    expect(defaults.weekly).toHaveLength(7);
    expect(defaults.weekly[0].dayName).toBe("Senin");
    expect(defaults.weekly[0].isOpen).toBe(true);
    expect(defaults.weekly[6].dayName).toBe("Minggu");
    expect(defaults.weekly[6].isOpen).toBe(false); // Minggu tutup
    expect(defaults.outOfHours.isEnabled).toBe(true);
    expect(defaults.outOfHours.message).toContain("Warung Sederhana");
  });

  it("4. OperatingHoursEvaluator bypasses owner completely", async () => {
    const ownerId = "00000000-0000-0000-0000-000000000001";
    const res = await OperatingHoursEvaluator.evaluate(
      ownerId,
      true, // isOwner
      "assistant"
    );

    expect(res.isClosed).toBe(false);
    expect(res.shouldIntercept).toBe(false);
  });

  it("5. OperatingHoursEvaluator treats unconfigured business_hours (empty {}) as open 24/7", async () => {
    // Non-existent owner or unconfigured business_hours returns isClosed: false
    const res = await OperatingHoursEvaluator.evaluate(
      "00000000-0000-0000-0000-000000000099",
      false, // customer
      "admin"
    );

    expect(res.isClosed).toBe(false);
    expect(res.shouldIntercept).toBe(false);
  });
});
