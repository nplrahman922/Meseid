import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { ConnectionEventHandler } from '../../src/whatsapp/events/connection.handler';
import type { WhatsAppSessionEntry } from '../../src/whatsapp/session/session.types';

describe('WhatsApp Connection Lifecycle & Anti-Loop Test Suite', () => {
  const fakeDisconnectReason = {
    loggedOut: 401,
    restartRequired: 515,
    timedOut: 408,
    connectionClosed: 428,
  };

  function createMockSession(status: WhatsAppSessionEntry['status'], phoneNumber?: string) {
    const ev = new EventEmitter();
    const entry: WhatsAppSessionEntry = {
      sessionId: 'test_session_anti_loop',
      sock: {
        ev: {
          on: (event: string, handler: any) => ev.on(event, handler),
          off: (event: string, handler: any) => ev.off(event, handler),
          removeAllListeners: (event?: string) => ev.removeAllListeners(event),
        },
        user: { id: phoneNumber ? `${phoneNumber}:1@s.whatsapp.net` : undefined },
        end: () => {},
      } as any,
      config: { sessionId: 'test_session_anti_loop' },
      status,
      storage: 'redis',
      phoneNumber,
      reconnectAttempts: 0,
      isDestroyed: false,
    };
    return { entry, ev };
  }

  it('1. Tidak memicu auto-reconnect jika sesi dalam status qr_ready dan koneksi terputus', async () => {
    const { entry, ev } = createMockSession('qr_ready', undefined);
    let reconnectCalled = false;

    ConnectionEventHandler.attach(entry, fakeDisconnectReason, {
      onReconnect: async () => {
        reconnectCalled = true;
      },
      isShuttingDown: () => false,
    });

    // Simulasikan koneksi terputus tanpa error code (Unknown / soket close)
    ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: new Error('Socket closed') },
    });

    // Beri jeda untuk memastikan timer tidak berjalan
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(entry.status, 'close');
    assert.equal(entry.reconnectTimer, undefined);
    assert.equal(reconnectCalled, false);
  });

  it('2. Mengabaikan semua event jika entry.isDestroyed bernilai true', async () => {
    const { entry, ev } = createMockSession('open', '628123456789');
    entry.isDestroyed = true;
    let reconnectCalled = false;

    ConnectionEventHandler.attach(entry, fakeDisconnectReason, {
      onReconnect: async () => {
        reconnectCalled = true;
      },
      isShuttingDown: () => false,
    });

    ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: new Error('Socket drop') },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(reconnectCalled, false);
    assert.equal(entry.reconnectTimer, undefined);
  });

  it('3. Memicu reconnect cepat (500ms) saat Baileys meminta restart kode 515 setelah scan QR', async () => {
    const { entry, ev } = createMockSession('qr_ready', undefined);
    let reconnectCalled = false;

    ConnectionEventHandler.attach(entry, fakeDisconnectReason, {
      onReconnect: async () => {
        reconnectCalled = true;
      },
      isShuttingDown: () => false,
    });

    ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 515 } } },
    });

    assert.ok(entry.reconnectTimer !== undefined, 'reconnectTimer harus dijadwalkan untuk restartRequired');

    // Tunggu 550ms agar timer 500ms tereksekusi
    await new Promise((resolve) => setTimeout(resolve, 550));
    assert.equal(reconnectCalled, true);
  });

  it('4. Auto-reconnect berjalan normal jika sesi sebelumnya sudah berstatus open (terotentikasi)', async () => {
    const { entry, ev } = createMockSession('open', '628123456789');

    ConnectionEventHandler.attach(entry, fakeDisconnectReason, {
      onReconnect: async () => {},
      isShuttingDown: () => false,
    });

    ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: new Error('Network jitter') },
    });

    assert.equal(entry.status, 'close');
    assert.ok(entry.reconnectTimer !== undefined, 'reconnectTimer harus dijadwalkan untuk sesi open');

    // Bersihkan timer
    if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
  });

  it('5. stopSession dengan purge=true memanggil sock.logout() untuk mencabut izin di WhatsApp mobile', async () => {
    let logoutCalled = false;
    let endCalled = false;
    const ev = new EventEmitter();

    const mockSock: any = {
      ev: {
        on: (event: string, handler: any) => ev.on(event, handler),
        off: (event: string, handler: any) => ev.off(event, handler),
        removeAllListeners: (event?: string) => ev.removeAllListeners(event),
      },
      logout: async () => {
        logoutCalled = true;
      },
      end: () => {
        endCalled = true;
      },
      user: { id: '628123456789:1@s.whatsapp.net' },
    };

    const sessionEntry: WhatsAppSessionEntry = {
      sessionId: 'test_session_logout_unpair',
      sock: mockSock,
      config: { sessionId: 'test_session_logout_unpair' },
      status: 'open',
      storage: 'redis',
      phoneNumber: '628123456789',
      reconnectAttempts: 0,
      isDestroyed: false,
    };

    const { sessionRegistry } = await import('../../src/whatsapp/session/session.registry');
    const { whatsAppBotManager } = await import('../../src/whatsapp/bot.manager');

    sessionRegistry.set('test_session_logout_unpair', sessionEntry);
    await whatsAppBotManager.stopSession('test_session_logout_unpair', true);

    assert.equal(logoutCalled, true, 'sock.logout() harus dipanggil saat purge = true');
    assert.equal(endCalled, true, 'sock.end() harus dipanggil setelah logout');
    assert.equal(sessionRegistry.get('test_session_logout_unpair'), undefined);
  });

  it('6. Mendeteksi event loggedOut (401) dari HP, mengubah status ke logged_out dan memicu sinkronisasi ke API', async () => {
    const { entry, ev } = createMockSession('open', '628123456789');
    let clearSessionCalled = false;
    entry.clearSession = async () => {
      clearSessionCalled = true;
    };

    const { apiClient } = await import('../../src/whatsapp/models/api.client');
    let notifiedSessionId: string | undefined;
    let notifiedOwnerId: string | undefined;
    const originalNotify = apiClient.notifyWhatsAppLoggedOut;
    apiClient.notifyWhatsAppLoggedOut = async (sId: string, oId?: string) => {
      notifiedSessionId = sId;
      notifiedOwnerId = oId;
      return true;
    };

    ConnectionEventHandler.attach(entry, fakeDisconnectReason, {
      onReconnect: async () => {},
      isShuttingDown: () => false,
    });

    // Simulasikan event close dengan statusCode 401 (logged out dari HP)
    ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: {
        error: { output: { statusCode: 401 } },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(entry.status, 'logged_out');
    assert.equal(clearSessionCalled, true);
    assert.equal(notifiedSessionId, 'test_session_anti_loop');

    apiClient.notifyWhatsAppLoggedOut = originalNotify;
  });
});
