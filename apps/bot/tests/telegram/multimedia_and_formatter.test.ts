import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { TelegramTextFormatter } from '../../src/telegram/formatters/telegram-text.formatter';
import { photoController } from '../../src/telegram/controllers/photo.controller';
import { audioController } from '../../src/telegram/controllers/audio.controller';
import { telegramMediaDownloader } from '../../src/telegram/media/telegram-media.downloader';
import { apiClient } from '../../src/telegram/models/api.client';

describe('Telegram Multimedia & Safe HTML Formatter Suite', () => {
  test('TEST 1: TelegramTextFormatter mengonversi Markdown AI & Web Search Links menjadi Safe HTML', () => {
    const rawMarkdown =
      'Halo! Berikut informasi dari pencarian web:\n\n' +
      'Berdasarkan sumber [Portal Berita Bisnis](https://bisnis.com/artikel-123), harga beras stabil.\n' +
      'Catatan penting: **Beli beras 5kg** seharga Rp 65.000.\n' +
      'Perkiraan: *sudah termasuk ongkir*.\n' +
      'Kode transaksi: `TRX-99881`.\n' +
      '```json\n{"status": "ok"}\n```';

    const formatted = TelegramTextFormatter.formatToTelegramHtml(rawMarkdown);

    // Hyperlink aktif
    assert.ok(formatted.includes('<a href="https://bisnis.com/artikel-123">Portal Berita Bisnis</a>'));
    // Bold
    assert.ok(formatted.includes('<b>Beli beras 5kg</b>'));
    // Italic
    assert.ok(formatted.includes('<i>sudah termasuk ongkir</i>'));
    // Inline code
    assert.ok(formatted.includes('<code>TRX-99881</code>'));
    // Code block
    assert.ok(formatted.includes('<pre><code>'));
    assert.ok(formatted.includes('{"status": "ok"}'));
  });

  test('TEST 2: TelegramTextFormatter melakukan escape karakter rawan XSS/HTML', () => {
    const rawInput = 'Perhitungan: 5 < 10 && 20 > 15';
    const formatted = TelegramTextFormatter.formatToTelegramHtml(rawInput);

    assert.ok(formatted.includes('&lt;'));
    assert.ok(formatted.includes('&gt;'));
    assert.ok(formatted.includes('&amp;&amp;'));
    assert.ok(!formatted.includes(' < '));
    assert.ok(!formatted.includes(' > '));
  });

  test('TEST 3: TelegramTextFormatter splitIntoChunks memecah teks panjang (>4000 char)', () => {
    const longParagraph = 'Kalimat transaksi akuntansi toko yang sangat rinci dan panjang.\n'.repeat(100);
    assert.ok(longParagraph.length > 4000);

    const chunks = TelegramTextFormatter.splitIntoChunks(longParagraph, 4000);
    assert.ok(chunks.length >= 2);

    for (const chunk of chunks) {
      assert.ok(chunk.length <= 4000, `Setiap chunk harus <= 4000 char, dapat: ${chunk.length}`);
    }
  });

  test('TEST 4: PhotoController mengirimkan payload lengkap dengan attachments data_base64 ke backend API', async () => {
    let capturedPayload: any = null;

    // Mock apiClient.sendInboundMessage
    const origSend = apiClient.sendInboundMessage;
    apiClient.sendInboundMessage = async (payload: any) => {
      capturedPayload = payload;
      return { status: 'success', reply_text: 'Foto nota berhasil dicatat.' };
    };

    // Mock telegramMediaDownloader.downloadAndOptimizePhoto
    const origDownload = telegramMediaDownloader.downloadAndOptimizePhoto;
    telegramMediaDownloader.downloadAndOptimizePhoto = async () => {
      return {
        buffer: Buffer.from('fake-optimized-image-binary'),
        base64: 'ZmFrZS1vcHRpbWl6ZWQtaW1hZ2UtYmluYXJ5',
        mimeType: 'image/jpeg',
        wasOptimized: true,
      };
    };

    let replySent = '';
    const mockCtx: any = {
      message: {
        message_id: 12345,
        date: Math.floor(Date.now() / 1000),
        caption: 'Nota belanja telur dan tepung',
        photo: [
          { file_id: 'thumb_id', file_size: 100 },
          { file_id: 'large_photo_id', file_size: 5000 },
        ],
      },
      from: { id: 998877, first_name: 'Owner', last_name: 'Toko', username: 'owner_toko' },
      chat: { id: 998877, type: 'private' },
      me: { id: 8655389335, username: 'EnB9e_bot' },
      replyWithChatAction: async () => true,
      reply: async (text: string) => {
        replySent = text;
        return { message_id: 67890 };
      },
      api: { token: 'mock-bot-token' },
    };

    try {
      await photoController.handlePhotoMessage(mockCtx);

      assert.ok(capturedPayload, 'Payload harus terkirim ke backend API');
      assert.strictEqual(capturedPayload.channel, 'telegram');
      assert.strictEqual(capturedPayload.message_type, 'photo');
      assert.strictEqual(capturedPayload.text, 'Nota belanja telur dan tepung');
      assert.ok(Array.isArray(capturedPayload.attachments));
      assert.strictEqual(capturedPayload.attachments.length, 1);
      assert.strictEqual(capturedPayload.attachments[0].file_type, 'photo');
      assert.strictEqual(capturedPayload.attachments[0].mime_type, 'image/jpeg');
      assert.strictEqual(capturedPayload.attachments[0].data_base64, 'ZmFrZS1vcHRpbWl6ZWQtaW1hZ2UtYmluYXJ5');
      assert.ok(replySent.includes('Foto nota berhasil dicatat'));
    } finally {
      apiClient.sendInboundMessage = origSend;
      telegramMediaDownloader.downloadAndOptimizePhoto = origDownload;
    }
  });

  test('TEST 5: AudioController mengirimkan payload voice note dengan message_type: audio dan data_base64', async () => {
    let capturedPayload: any = null;

    const origSend = apiClient.sendInboundMessage;
    apiClient.sendInboundMessage = async (payload: any) => {
      capturedPayload = payload;
      return { status: 'success', reply_text: 'Suara berhasil ditranskripsikan: Beli telur 2kg 54000' };
    };

    const origDownload = telegramMediaDownloader.downloadAudio;
    telegramMediaDownloader.downloadAudio = async () => {
      return {
        buffer: Buffer.from('fake-voice-ogg-binary'),
        base64: 'ZmFrZS12b2ljZS1vZ2ctYmluYXJ5',
        mimeType: 'audio/ogg',
      };
    };

    let replySent = '';
    const mockCtx: any = {
      message: {
        message_id: 54321,
        date: Math.floor(Date.now() / 1000),
        voice: {
          file_id: 'voice_ogg_id',
          file_size: 2500,
          mime_type: 'audio/ogg',
          duration: 3,
        },
      },
      from: { id: 998877, first_name: 'Owner', last_name: 'Toko', username: 'owner_toko' },
      chat: { id: 998877, type: 'private' },
      me: { id: 8655389335, username: 'EnB9e_bot' },
      replyWithChatAction: async () => true,
      reply: async (text: string) => {
        replySent = text;
        return { message_id: 99999 };
      },
      api: { token: 'mock-bot-token' },
    };

    try {
      await audioController.handleVoiceMessage(mockCtx);

      assert.ok(capturedPayload, 'Payload voice note harus terkirim ke backend API');
      assert.strictEqual(capturedPayload.channel, 'telegram');
      assert.strictEqual(capturedPayload.message_type, 'audio');
      assert.ok(Array.isArray(capturedPayload.attachments));
      assert.strictEqual(capturedPayload.attachments[0].file_type, 'audio');
      assert.strictEqual(capturedPayload.attachments[0].mime_type, 'audio/ogg');
      assert.strictEqual(capturedPayload.attachments[0].data_base64, 'ZmFrZS12b2ljZS1vZ2ctYmluYXJ5');
      assert.ok(replySent.includes('Beli telur 2kg 54000'));
    } finally {
      apiClient.sendInboundMessage = origSend;
      telegramMediaDownloader.downloadAudio = origDownload;
    }
  });

  test('TEST 6: Verifikasi Kepatuhan AGENTS.md: Batas Ukuran Baris (< 400 baris) pada seluruh modul telegram', () => {
    const filesToCheck = [
      '../../src/telegram/media/telegram-media.downloader.ts',
      '../../src/telegram/formatters/telegram-text.formatter.ts',
      '../../src/telegram/controllers/photo.controller.ts',
      '../../src/telegram/controllers/audio.controller.ts',
      '../../src/telegram/controllers/callback.controller.ts',
      '../../src/telegram/controllers/chat.controller.ts',
      '../../src/telegram/router.ts',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = resolve(__dirname, relPath);
      assert.ok(existsSync(fullPath), `File harus ada: ${relPath}`);
      const content = readFileSync(fullPath, 'utf-8');
      const lineCount = content.split('\n').length;
      assert.ok(lineCount < 400, `File ${relPath} melebihi batas 400 baris (${lineCount} baris)`);
    }
  });
});
