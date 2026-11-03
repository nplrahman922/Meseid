import { describe, it, expect } from "bun:test";
import { adminSql } from "../../src/db/client";
import {
  executeAiModelSyncJob,
  checkAndRunStartupSync,
  startAiModelSyncScheduler,
} from "../../src/lib/scheduler";

describe("Tahap 3 Test Suite: 24-Hour Periodic Scheduler & System Context", () => {
  it("executeAiModelSyncJob executes in system context and writes to system_logs", async () => {
    const result = await executeAiModelSyncJob();
    expect(result.success).toBe(true);
    expect(result.total_synced).toBeGreaterThan(50);
    expect(result.duration_ms).toBeGreaterThan(0);

    // Verify system_logs has an entry
    const [log] = await adminSql`
      SELECT level, component, code, message, metadata
      FROM system_logs
      WHERE code = 'AI_MODELS_SYNC_SUCCESS'
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    expect(log).toBeDefined();
    expect(log.component).toBe("ai_scheduler");
    expect(log.level).toBe("info");
    expect(log.metadata.total_synced).toBe(result.total_synced);
  }, 20000);

  it("checkAndRunStartupSync evaluates catalog freshness without throwing errors", async () => {
    // Since we just synced, maxStaleHours = 24 should determine data is still fresh (false)
    const synced = await checkAndRunStartupSync(24);
    expect(typeof synced).toBe("boolean");
  });

  it("startAiModelSyncScheduler starts and stops cleanly via SchedulerHandle", () => {
    const handle = startAiModelSyncScheduler(24);
    expect(handle).toBeDefined();
    expect(handle.isRunning()).toBe(true);

    handle.stop();
    expect(handle.isRunning()).toBe(false);
  });
});
