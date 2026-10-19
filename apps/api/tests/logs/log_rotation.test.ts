import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  getCurrentMonthlyLogFileName,
  pruneOldLogFiles,
  appendErrorLog,
  MAX_MONTHLY_LOG_FILES,
} from "../../src/logs/file.appender";

describe("Log Rotation & Retention Policy Suite (Monthly Files, Max 10 Limit)", () => {
  let testLogDir: string;

  beforeEach(() => {
    // Isolated temporary directory for every test run
    testLogDir = fs.mkdtempSync(path.join(os.tmpdir(), "meseid-log-test-"));
  });

  afterEach(() => {
    // Clean up temporary directory after each test
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // 1. Monthly File Naming
  // ==========================================================================
  describe("Monthly File Naming Format", () => {
    it("generates correct error-YYYY-MM.log for standard and boundary months", () => {
      expect(getCurrentMonthlyLogFileName(new Date("2026-01-15T00:00:00Z"))).toBe(
        "error-2026-01.log"
      );
      expect(getCurrentMonthlyLogFileName(new Date("2026-10-19T21:00:00Z"))).toBe(
        "error-2026-10.log"
      );
      expect(getCurrentMonthlyLogFileName(new Date("2026-12-31T23:59:59Z"))).toBe(
        "error-2026-12.log"
      );
      expect(getCurrentMonthlyLogFileName(new Date("2027-02-01T10:00:00Z"))).toBe(
        "error-2027-02.log"
      );
    });
  });

  // ==========================================================================
  // 2. Monthly File Creation
  // ==========================================================================
  describe("Monthly File Creation Across Months", () => {
    it("creates separate monthly log files when logs are recorded in different months", async () => {
      const month1 = new Date("2026-08-10T12:00:00Z");
      const month2 = new Date("2026-09-15T14:30:00Z");
      const month3 = new Date("2026-10-19T20:00:00Z");

      await appendErrorLog("WARN", "auth", "User login warning", { attempt: 1 }, undefined, {
        date: month1,
        logDir: testLogDir,
      });

      await appendErrorLog("ERROR", "owner", "Owner update failed", undefined, new Error("DB error"), {
        date: month2,
        logDir: testLogDir,
      });

      await appendErrorLog("ERROR", "admin", "Admin access error", { adminId: "adm-1" }, undefined, {
        date: month3,
        logDir: testLogDir,
      });

      const files = fs.readdirSync(testLogDir).sort();
      expect(files).toEqual(["error-2026-08.log", "error-2026-09.log", "error-2026-10.log"]);

      // Verify file contents
      const contentAug = fs.readFileSync(path.join(testLogDir, "error-2026-08.log"), "utf-8");
      expect(contentAug).toContain("[WARN]");
      expect(contentAug).toContain("[AUTH]");
      expect(contentAug).toContain("User login warning");
      expect(contentAug).toContain('"attempt":1');

      const contentSep = fs.readFileSync(path.join(testLogDir, "error-2026-09.log"), "utf-8");
      expect(contentSep).toContain("[ERROR]");
      expect(contentSep).toContain("[OWNER]");
      expect(contentSep).toContain("Owner update failed");
      expect(contentSep).toContain("DB error");

      const contentOct = fs.readFileSync(path.join(testLogDir, "error-2026-10.log"), "utf-8");
      expect(contentOct).toContain("[ERROR]");
      expect(contentOct).toContain("[ADMIN]");
      expect(contentOct).toContain("Admin access error");
    });
  });

  // ==========================================================================
  // 3. 10-File Retention & Pruning Rule
  // ==========================================================================
  describe("10-File Monthly Retention & Pruning Rule", () => {
    it("keeps all files when total count is less than or equal to 10", () => {
      // Create 8 monthly files
      for (let i = 1; i <= 8; i++) {
        const month = String(i).padStart(2, "0");
        fs.writeFileSync(path.join(testLogDir, `error-2026-${month}.log`), `Log month ${month}`);
      }

      pruneOldLogFiles(testLogDir, 10);

      const remainingFiles = fs.readdirSync(testLogDir);
      expect(remainingFiles.length).toBe(8);
    });

    it("automatically deletes the oldest files when monthly count exceeds 10", () => {
      // Simulate 15 consecutive monthly files: 2025-01 through 2026-03
      const allFiles = [
        "error-2025-01.log",
        "error-2025-02.log",
        "error-2025-03.log",
        "error-2025-04.log",
        "error-2025-05.log",
        "error-2025-06.log",
        "error-2025-07.log",
        "error-2025-08.log",
        "error-2025-09.log",
        "error-2025-10.log",
        "error-2025-11.log",
        "error-2025-12.log",
        "error-2026-01.log",
        "error-2026-02.log",
        "error-2026-03.log",
      ];

      for (const file of allFiles) {
        fs.writeFileSync(path.join(testLogDir, file), `Content for ${file}`);
      }

      expect(fs.readdirSync(testLogDir).length).toBe(15);

      // Prune with limit 10
      pruneOldLogFiles(testLogDir, MAX_MONTHLY_LOG_FILES);

      const remainingFiles = fs.readdirSync(testLogDir).sort();
      expect(remainingFiles.length).toBe(10);

      // Verify the 5 oldest files (2025-01 to 2025-05) were pruned
      expect(remainingFiles).not.toContain("error-2025-01.log");
      expect(remainingFiles).not.toContain("error-2025-02.log");
      expect(remainingFiles).not.toContain("error-2025-03.log");
      expect(remainingFiles).not.toContain("error-2025-04.log");
      expect(remainingFiles).not.toContain("error-2025-05.log");

      // Verify the 10 newest files remain intact
      expect(remainingFiles).toEqual([
        "error-2025-06.log",
        "error-2025-07.log",
        "error-2025-08.log",
        "error-2025-09.log",
        "error-2025-10.log",
        "error-2025-11.log",
        "error-2025-12.log",
        "error-2026-01.log",
        "error-2026-02.log",
        "error-2026-03.log",
      ]);
    });

    it("does not delete non-matching files (e.g. .keep or other extensions)", () => {
      // Create 12 error files plus a .keep file and a readme file
      for (let i = 1; i <= 12; i++) {
        const month = String(i).padStart(2, "0");
        fs.writeFileSync(path.join(testLogDir, `error-2025-${month}.log`), `log ${month}`);
      }
      fs.writeFileSync(path.join(testLogDir, ".keep"), "keep me");
      fs.writeFileSync(path.join(testLogDir, "notes.txt"), "important notes");

      pruneOldLogFiles(testLogDir, 10);

      const remaining = fs.readdirSync(testLogDir);
      // 10 log files + 2 non-log files = 12 total
      expect(remaining.length).toBe(12);
      expect(remaining).toContain(".keep");
      expect(remaining).toContain("notes.txt");
    });
  });

  // ==========================================================================
  // 4. End-to-End Append with Auto-Pruning
  // ==========================================================================
  describe("End-to-End appendErrorLog Auto-Pruning", () => {
    it("automatically maintains exactly 10 log files as new months are logged", async () => {
      // Append across 14 consecutive months
      for (let monthIdx = 1; monthIdx <= 14; monthIdx++) {
        const year = monthIdx <= 12 ? 2025 : 2026;
        const monthNum = monthIdx <= 12 ? monthIdx : monthIdx - 12;
        const testDate = new Date(`${year}-${String(monthNum).padStart(2, "0")}-10T10:00:00Z`);

        await appendErrorLog(
          "ERROR",
          "system",
          `Monthly incident report for ${year}-${monthNum}`,
          { monthIdx },
          undefined,
          { date: testDate, logDir: testLogDir }
        );
      }

      const files = fs.readdirSync(testLogDir).sort();
      expect(files.length).toBe(10);

      // First 4 months (2025-01, 2025-02, 2025-03, 2025-04) must have been auto-deleted
      expect(files).not.toContain("error-2025-01.log");
      expect(files).not.toContain("error-2025-02.log");
      expect(files).not.toContain("error-2025-03.log");
      expect(files).not.toContain("error-2025-04.log");

      // 10 newest files must be present
      expect(files).toEqual([
        "error-2025-05.log",
        "error-2025-06.log",
        "error-2025-07.log",
        "error-2025-08.log",
        "error-2025-09.log",
        "error-2025-10.log",
        "error-2025-11.log",
        "error-2025-12.log",
        "error-2026-01.log",
        "error-2026-02.log",
      ]);
    });
  });
});
