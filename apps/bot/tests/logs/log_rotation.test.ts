import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getCurrentMonthlyLogFileName,
  pruneOldLogFiles,
  appendErrorLog,
  MAX_MONTHLY_LOG_FILES,
} from '../../src/logs/file.appender';
import { createModuleLogger } from '../../src/logs/logger';

describe('Bot Log Rotation & Retention Suite (Monthly Files, Max 10 Limit)', () => {
  let testLogDir: string;

  beforeEach(() => {
    testLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meseid-bot-log-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  test('Format nama file bulanan: error-YYYY-MM.log', () => {
    assert.strictEqual(
      getCurrentMonthlyLogFileName(new Date('2026-01-15T00:00:00Z')),
      'error-2026-01.log'
    );
    assert.strictEqual(
      getCurrentMonthlyLogFileName(new Date('2026-10-20T01:00:00Z')),
      'error-2026-10.log'
    );
    assert.strictEqual(
      getCurrentMonthlyLogFileName(new Date('2026-12-15T12:00:00Z')),
      'error-2026-12.log'
    );
  });

  test('Membuat dan menambahkan log ke file bulanan yang sesuai', async () => {
    const testDate = new Date('2026-10-20T01:30:00Z');

    await appendErrorLog(
      'WARN',
      'telegram',
      'Peringatan koneksi timeout',
      { botId: '8655389335', attempt: 1 },
      undefined,
      { date: testDate, logDir: testLogDir }
    );

    const expectedFile = path.join(testLogDir, 'error-2026-10.log');
    assert.strictEqual(fs.existsSync(expectedFile), true, 'File log bulanan harus dibuat');

    const content = fs.readFileSync(expectedFile, 'utf-8');
    assert.ok(content.includes('[WARN]'));
    assert.ok(content.includes('[TELEGRAM]'));
    assert.ok(content.includes('Peringatan koneksi timeout'));
    assert.ok(content.includes('"botId":"8655389335"'));
  });

  test('Retention policy: hanya menyimpan maksimal 10 file bulanan dan menghapus yang terlama', () => {
    // Buat 15 file log bulanan tiruan dari 2025-01 sampai 2026-03
    for (let i = 1; i <= 15; i++) {
      const monthStr = String(i).padStart(2, '0');
      const filename = i <= 12 ? `error-2025-${monthStr}.log` : `error-2026-0${i - 12}.log`;
      fs.writeFileSync(path.join(testLogDir, filename), `Log data for ${filename}\n`);
    }

    let files = fs.readdirSync(testLogDir);
    assert.strictEqual(files.length, 15, 'Harus ada 15 file sebelum pruning');

    // Jalankan pruning dengan batas MAX_MONTHLY_LOG_FILES (10)
    pruneOldLogFiles(testLogDir, MAX_MONTHLY_LOG_FILES);

    files = fs.readdirSync(testLogDir);
    assert.strictEqual(files.length, 10, 'Jumlah file setelah pruning harus tepat 10');

    // 5 file tertua dari 2025-01 sampai 2025-05 harus terhapus
    for (let i = 1; i <= 5; i++) {
      const monthStr = String(i).padStart(2, '0');
      assert.strictEqual(
        fs.existsSync(path.join(testLogDir, `error-2025-${monthStr}.log`)),
        false,
        `File tertua error-2025-${monthStr}.log harus terhapus`
      );
    }

    // 10 file terbaru harus tetap ada
    assert.strictEqual(fs.existsSync(path.join(testLogDir, 'error-2026-03.log')), true);
    assert.strictEqual(fs.existsSync(path.join(testLogDir, 'error-2026-02.log')), true);
    assert.strictEqual(fs.existsSync(path.join(testLogDir, 'error-2026-01.log')), true);
  });

  test('ModuleLogger dapat mencatat error dan membuat log file', async () => {
    const testLogger = createModuleLogger('test-service');
    assert.strictEqual(testLogger.moduleName, 'test-service');

    // Tidak boleh melempar exception saat info / warn / error
    testLogger.info('Testing info log message');
    testLogger.warn('Testing warn log message', { testKey: 'val' });
    testLogger.error('Testing error log message', new Error('Dummy test error'), { code: 500 });
  });
});
