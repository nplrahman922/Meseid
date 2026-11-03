import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { whatsAppView } from '../../src/whatsapp/views/whatsapp.view';
import { whatsAppBotManager } from '../../src/whatsapp/bot.manager';
import { whatsAppRouter } from '../../src/whatsapp/router';
import type { WAMessage } from '../../src/whatsapp/baileys.loader';

describe('WhatsApp Module Suite (MVC + Router)', () => {
  describe('WhatsAppView Formatter', () => {
    it('renderWelcome menyertakan sapaan pushName dan petunjuk penggunaan', () => {
      const output = whatsAppView.renderWelcome('Budi', 'Asisten Bisnis');
      assert.ok(output.includes('Halo *Budi*!'));
      assert.ok(output.includes('Asisten Bisnis'));
      assert.ok(output.includes('/help'));
      assert.ok(output.includes('/status'));
    });

    it('renderHelp menyertakan panduan transaksi dan nota belanja', () => {
      const output = whatsAppView.renderHelp();
      assert.ok(output.includes('Panduan Penggunaan Asisten Bisnis Meseid (WhatsApp)'));
      assert.ok(output.includes('Mencatat Pengeluaran & Pemasukan'));
      assert.ok(output.includes('Foto Struk'));
    });

    it('renderStatus menampilkan status online / menunggu koneksi', () => {
      const onlineStatus = whatsAppView.renderStatus('session_test', '628123456789', true);
      assert.ok(onlineStatus.includes('session_test'));
      assert.ok(onlineStatus.includes('628123456789'));
      assert.ok(onlineStatus.includes('🟢 Terhubung (Online)'));

      const offlineStatus = whatsAppView.renderStatus('session_test', '', false);
      assert.ok(offlineStatus.includes('🟡 Menunggu Koneksi'));
    });

    it('renderActionMenu menghasilkan daftar opsi bernomor yang kompatibel', () => {
      const buttons = [
        { label: 'Ya, Simpan Transaksi', callback_data: 'confirm_trx' },
        { label: 'Batalkan', callback_data: 'cancel_trx' },
      ];
      const menu = whatsAppView.renderActionMenu(buttons);
      assert.ok(menu.includes('*[1]* Ya, Simpan Transaksi'));
      assert.ok(menu.includes('*[2]* Batalkan'));
      assert.ok(menu.includes('Ketik angka pilihan Anda'));
    });

    it('formatReplyWithActions menggabungkan teks balasan dengan opsi menu', () => {
      const reply = whatsAppView.formatReplyWithActions('Catatan pengeluaran tersimpan.', [
        { label: 'Lihat Kas', callback_data: 'view_cash' },
      ]);
      assert.ok(reply.startsWith('Catatan pengeluaran tersimpan.'));
      assert.ok(reply.includes('*[1]* Lihat Kas'));
    });
  });

  describe('WhatsAppBotManager Session Registry & Outbound Validation', () => {
    it('getSessionStatuses mengembalikan array status sesi', () => {
      const statuses = whatsAppBotManager.getSessionStatuses();
      assert.ok(Array.isArray(statuses));
    });

    it('sendMessage mengembalikan error terstruktur jika sesi tidak ditemukan', async () => {
      const result = await whatsAppBotManager.sendMessage({
        channel: 'whatsapp',
        session_id: 'non_existent_session_123',
        recipient_id: '628111222333',
        message: 'Halo tes pesan',
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes('tidak ditemukan'));
    });
  });

  describe('WhatsAppRouter Filtering & Ignore Logic', () => {
    it('mengabaikan pesan jika fromMe bernilai true', async () => {
      const fakeSock: any = {
        sendMessage: async () => {
          assert.fail('sendMessage tidak boleh dipanggil untuk pesan fromMe');
        },
      };

      const fakeUpsert: any = {
        type: 'notify',
        messages: [
          {
            key: {
              fromMe: true,
              remoteJid: '628111222333@s.whatsapp.net',
              id: 'MSG_FROM_ME_001',
            },
            message: { conversation: 'Pesan dari bot sendiri' },
          },
        ],
      };

      await whatsAppRouter.handleUpsert(
        fakeSock,
        fakeUpsert,
        'test_session',
        '628123456789',
        true
      );
    });

    it('mengabaikan pesan status broadcast (status@broadcast)', async () => {
      const fakeSock: any = {
        sendMessage: async () => {
          assert.fail('sendMessage tidak boleh dipanggil untuk status broadcast');
        },
      };

      const fakeUpsert: any = {
        type: 'notify',
        messages: [
          {
            key: {
              fromMe: false,
              remoteJid: 'status@broadcast',
              id: 'BROADCAST_001',
            },
            message: { conversation: 'Update status teman' },
          },
        ],
      };

      await whatsAppRouter.handleUpsert(
        fakeSock,
        fakeUpsert,
        'test_session',
        '628123456789',
        true
      );
    });

    it('merutekan perintah /start dengan memanggil sendMessage selamat datang', async () => {
      let sentText = '';
      let targetJid = '';

      const fakeSock: any = {
        sendMessage: async (jid: string, content: { text: string }) => {
          targetJid = jid;
          sentText = content.text;
          return { key: { id: 'RESP_001' } };
        },
      };

      const fakeUpsert: any = {
        type: 'notify',
        messages: [
          {
            key: {
              fromMe: false,
              remoteJid: '628999888777@s.whatsapp.net',
              id: 'CMD_START_001',
            },
            pushName: 'Pak Joni',
            message: { conversation: '/start' },
          },
        ],
      };

      await whatsAppRouter.handleUpsert(
        fakeSock,
        fakeUpsert,
        'test_session',
        '628123456789',
        true
      );

      assert.equal(targetJid, '628999888777@s.whatsapp.net');
      assert.ok(sentText.includes('Halo *Pak Joni*!'));
      assert.ok(sentText.includes('/help'));
    });
  });
});
