import fs from 'node:fs';
import path from 'node:path';

export const MAX_MONTHLY_LOG_FILES = 10;

/**
 * Menentukan direktori target penyimpanan error log service bot.
 * Mengikuti arsitektur monorepo: logs/error/bot (atau process.env.ERROR_LOG_DIR).
 */
export function resolveLogDir(): string {
  if (process.env.ERROR_LOG_DIR) {
    return path.resolve(process.env.ERROR_LOG_DIR);
  }

  // Cari workspace root jika ada docker-compose.yml atau .gitignore
  const workspaceRoot = path.resolve(__dirname, '../../../../');
  if (
    fs.existsSync(path.join(workspaceRoot, 'docker-compose.yml')) ||
    fs.existsSync(path.join(workspaceRoot, '.gitignore'))
  ) {
    return path.join(workspaceRoot, 'logs', 'error', 'bot');
  }

  // Fallback untuk container atau eksekusi lokal mandiri
  return path.resolve(process.cwd(), 'logs', 'error', 'bot');
}

/**
 * Menghasilkan format nama file log bulanan: error-YYYY-MM.log
 */
export function getCurrentMonthlyLogFileName(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `error-${year}-${month}.log`;
}

/**
 * Menjalankan retention policy: menyimpan maksimal maxFiles (default 10)
 * file bulanan dan menghapus file terlama jika melebihi batas.
 */
export function pruneOldLogFiles(logDir: string, maxFiles: number = MAX_MONTHLY_LOG_FILES): void {
  try {
    if (!fs.existsSync(logDir)) return;

    const files = fs.readdirSync(logDir);

    // Filter file yang cocok dengan pola error-YYYY-MM.log
    const logFiles = files
      .filter((file) => /^error-\d{4}-\d{2}\.log$/.test(file))
      .sort((a, b) => b.localeCompare(a)); // Descending: terbaru ke terlama (e.g. 2026-10, 2026-09)

    // Jika melebihi batas, hapus file tertua
    if (logFiles.length > maxFiles) {
      const filesToDelete = logFiles.slice(maxFiles);
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(path.join(logDir, file));
        } catch {
          // Abaikan kegagalan hapus file tunggal
        }
      }
    }
  } catch {
    // Fail-safe: abaikan error pemindaian direktori
  }
}

export interface AppendLogOptions {
  date?: Date;
  logDir?: string;
}

/**
 * Menambahkan catatan log WARN atau ERROR ke file log bulanan secara asynchronous.
 */
export async function appendErrorLog(
  level: 'WARN' | 'ERROR',
  moduleName: string,
  message: string,
  context?: Record<string, any>,
  err?: any,
  options?: AppendLogOptions
): Promise<void> {
  try {
    const logDir = options?.logDir || resolveLogDir();
    const targetDate = options?.date || new Date();

    // Pastikan folder log ada
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

    line += '\n';

    await fs.promises.appendFile(filePath, line, 'utf-8');

    // Terapkan retensi 10 file setelah penulisan
    pruneOldLogFiles(logDir, MAX_MONTHLY_LOG_FILES);
  } catch (appendErr) {
    // Fail-safe: Jangan biarkan kegagalan penulisan disk mematikan server bot
    console.error('[Bot Logger File Appender Error]', appendErr);
  }
}
