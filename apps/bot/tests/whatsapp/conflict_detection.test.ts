import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { sessionRegistry } from '../../src/whatsapp/session/session.registry';
import { validateConnectionConflict } from '../../src/whatsapp/events/connection-conflict.validator';
import { SECURITY_ALERT_MESSAGE } from '../../src/whatsapp/dispatch/security-alert.sender';
import type { WhatsAppSessionEntry } from '../../src/whatsapp/session/session.types';

describe('WhatsApp Conflict Detection & Security Alert Suite', () => {
  beforeEach(() => {
    // Reset session registry
    for (const id of Array.from(sessionRegistry.getAll().keys())) {
      sessionRegistry.delete(id);
    }
  });

  it('SECURITY_ALERT_MESSAGE harus memuat peringatan resmi, himbauan penolakan, dan instruksi disconnect', () => {
    assert.ok(SECURITY_ALERT_MESSAGE.includes('PERINGATAN KEAMANAN MESEID'));
    assert.ok(SECURITY_ALERT_MESSAGE.includes('MENOLAK'));
    assert.ok(SECURITY_ALERT_MESSAGE.includes('Disconnect'));
    assert.ok(SECURITY_ALERT_MESSAGE.includes('akun bisnis baru'));
  });

  it('harus mendeteksi konflik in-memory jika nomor telepon sama aktif di sesi lain', async () => {
    // Daftarkan sesi A yang aktif
    const mockSessionA: WhatsAppSessionEntry = {
      sessionId: 'session_owner_a',
      sock: {} as any,
      config: { sessionId: 'session_owner_a' },
      status: 'open',
      storage: 'file',
      phoneNumber: '6281234567890',
      reconnectAttempts: 0,
    };
    sessionRegistry.set('session_owner_a', mockSessionA);

    // Coba validasi sesi B dengan nomor HP yang sama
    const result = await validateConnectionConflict(
      '6281234567890',
      'session_owner_b'
    );

    assert.strictEqual(result.isConflict, true);
    assert.ok(result.reason?.includes('session_owner_a'));
  });

  it('harus mengizinkan koneksi jika sesi sama yang melakukan reconnect (nomor sama, sessionId sama)', async () => {
    const mockSessionA: WhatsAppSessionEntry = {
      sessionId: 'session_owner_a',
      sock: {} as any,
      config: { sessionId: 'session_owner_a' },
      status: 'open',
      storage: 'file',
      phoneNumber: '6281234567890',
      reconnectAttempts: 0,
    };
    sessionRegistry.set('session_owner_a', mockSessionA);

    // Validasi sesi A itu sendiri (re-connect / refresh)
    const result = await validateConnectionConflict(
      '6281234567890',
      'session_owner_a'
    );

    assert.strictEqual(result.isConflict, false);
  });

  it('harus mengizinkan jika nomor berbeda', async () => {
    const mockSessionA: WhatsAppSessionEntry = {
      sessionId: 'session_owner_a',
      sock: {} as any,
      config: { sessionId: 'session_owner_a' },
      status: 'open',
      storage: 'file',
      phoneNumber: '6281234567890',
      reconnectAttempts: 0,
    };
    sessionRegistry.set('session_owner_a', mockSessionA);

    // Validasi sesi B dengan nomor berbeda
    const result = await validateConnectionConflict(
      '6289999999999',
      'session_owner_b'
    );

    assert.strictEqual(result.isConflict, false);
  });
});
