import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ImageOptimizer } from '../../src/whatsapp/media/image-optimizer';

describe('WhatsApp Image Optimizer Suite', () => {
  test('Mengompres dan me-resize gambar resolusi tinggi (>1024px) ke dimensi maksimal 1024px', async () => {
    // Buat gambar simulasi 2000x1500 piksel
    const rawLargeBuffer = await sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const result = await ImageOptimizer.optimize(rawLargeBuffer, 'image/jpeg');

    assert.strictEqual(result.wasOptimized, true);
    assert.strictEqual(result.mimeType, 'image/jpeg');
    assert.ok(result.base64.length > 0);

    // Verifikasi dimensi hasil kompresi
    const metadata = await sharp(result.buffer).metadata();
    assert.ok((metadata.width || 0) <= 1024, `Lebar harus <= 1024px, dapat: ${metadata.width}`);
    assert.ok((metadata.height || 0) <= 1024, `Tinggi harus <= 1024px, dapat: ${metadata.height}`);
    assert.ok(result.buffer.length < rawLargeBuffer.length, 'Ukuran hasil kompresi harus lebih kecil dari buffer mentah');
  });

  test('Melewati re-encode jika gambar sudah kecil (<200KB dan <=1024px)', async () => {
    // Buat gambar simulasi 200x200 piksel
    const smallBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 200, g: 200, b: 200 },
      },
    })
      .jpeg({ quality: 70 })
      .toBuffer();

    const result = await ImageOptimizer.optimize(smallBuffer, 'image/jpeg');

    assert.strictEqual(result.wasOptimized, false);
    assert.strictEqual(result.buffer.length, smallBuffer.length);
    assert.strictEqual(result.base64, smallBuffer.toString('base64'));
  });

  test('Graceful fallback jika input bukan format gambar valid tanpa melempar exception', async () => {
    const invalidBuffer = Buffer.from('bukan data gambar valid');
    const result = await ImageOptimizer.optimize(invalidBuffer, 'image/jpeg');

    assert.strictEqual(result.wasOptimized, false);
    assert.strictEqual(result.buffer.toString(), 'bukan data gambar valid');
    assert.strictEqual(result.base64, invalidBuffer.toString('base64'));
  });
});
