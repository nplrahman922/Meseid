import fs from "node:fs";
import path from "node:path";

export const MAX_MONTHLY_LOG_FILES = 10;

/**
 * Resolves the target directory for storing error logs.
 * In this monorepo structure, service error logs are separated by service name:
 * Target: logs/error/api (or process.env.ERROR_LOG_DIR if specified).
 */
export function resolveLogDir(): string {
  if (process.env.ERROR_LOG_DIR) {
    return path.resolve(process.env.ERROR_LOG_DIR);
  }

  // Check if workspace root has docker-compose.yml or .gitignore
  const workspaceRoot = path.resolve(import.meta.dir, "../../../../");
  if (
    fs.existsSync(path.join(workspaceRoot, "docker-compose.yml")) ||
    fs.existsSync(path.join(workspaceRoot, ".gitignore"))
  ) {
    return path.join(workspaceRoot, "logs", "error", "api");
  }

  // Fallback for container or isolated execution
  return path.resolve(process.cwd(), "logs", "error", "api");
}

/**
 * Generates the monthly log file name format: error-YYYY-MM.log
 */
export function getCurrentMonthlyLogFileName(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `error-${year}-${month}.log`;
}

/**
 * Enforces the retention policy: keeps at most maxFiles (default 10)
 * monthly log files and deletes the oldest ones exceeding the limit.
 */
export function pruneOldLogFiles(logDir: string, maxFiles: number = MAX_MONTHLY_LOG_FILES): void {
  try {
    if (!fs.existsSync(logDir)) return;

    const files = fs.readdirSync(logDir);

    // Filter files matching error-YYYY-MM.log
    const logFiles = files
      .filter((file) => /^error-\d{4}-\d{2}\.log$/.test(file))
      .sort((a, b) => b.localeCompare(a)); // Descending: newest first (e.g. 2026-10, 2026-09)

    // If file count exceeds maxFiles, delete the oldest files
    if (logFiles.length > maxFiles) {
      const filesToDelete = logFiles.slice(maxFiles);
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(path.join(logDir, file));
        } catch {
          // Ignore delete failures
        }
      }
    }
  } catch (err) {
    // Fail-safe: ignore directory scanning error
  }
}

export interface AppendLogOptions {
  date?: Date;
  logDir?: string;
}

/**
 * Appends a warning or error log entry to the current month's log file asynchronously.
 */
export async function appendErrorLog(
  level: "WARN" | "ERROR",
  moduleName: string,
  message: string,
  context?: Record<string, any>,
  err?: any,
  options?: AppendLogOptions
): Promise<void> {
  try {
    const logDir = options?.logDir || resolveLogDir();
    const targetDate = options?.date || new Date();

    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const fileName = getCurrentMonthlyLogFileName(targetDate);
    const filePath = path.join(logDir, fileName);

    const timestamp = targetDate.toISOString();
    let line = `[${timestamp}] [${level}] [${moduleName.toUpperCase()}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      const { module: _, ...rest } = context;
      if (Object.keys(rest).length > 0) {
        line += ` | Context: ${JSON.stringify(rest)}`;
      }
    }

    if (err) {
      const errorDetail = err instanceof Error ? (err.stack || err.message) : String(err);
      line += `\n  Error: ${errorDetail}`;
    }

    line += "\n";

    await fs.promises.appendFile(filePath, line, "utf-8");

    // Enforce 10 monthly files retention after writing
    pruneOldLogFiles(logDir, MAX_MONTHLY_LOG_FILES);
  } catch (appendErr) {
    // Fail-safe: Don't crash HTTP server if disk append fails
    console.error("[Logger File Appender Error]", appendErr);
  }
}

