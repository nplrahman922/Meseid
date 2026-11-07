import sharp from 'sharp';
import { createModuleLogger } from '../../logs';

const mediaLogger = createModuleLogger('image-optimizer');

export interface OptimizedImageResult {
  buffer: Buffer;
  base64: string;
  mimeType: string;
  wasOptimized: boolean;
}

/**
 * ImageOptimizer:
 * Mengoptimalkan dan mengompres buffer gambar kamera (WhatsApp/Telegram)
 * sebelum di-encode ke Base64 agar ramah bandwidth dan aman dari payload limit gateway AI.
 */
export class ImageOptimizer {
  private static readonly MAX_DIMENSION = 1024;
  private static readonly JPEG_QUALITY = 80;

  static async optimize(
    inputBuffer: Buffer,
    originalMime: string = 'image/jpeg'
  ): Promise<OptimizedImageResult> {
    const originalSize = inputBuffer.length;

    try {
      const metadata = await sharp(inputBuffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Jika gambar sudah kecil (< 200 KB) dan dimensinya tidak melebihi 1024px, lewati re-encode
      if (originalSize < 200 * 1024 && width <= this.MAX_DIMENSION && height <= this.MAX_DIMENSION) {
        return {
          buffer: inputBuffer,
          base64: inputBuffer.toString('base64'),
          mimeType: originalMime,
          wasOptimized: false,
        };
      }

      const resizedBuffer = await sharp(inputBuffer)
        .rotate() // Otomatis koreksi orientasi EXIF kamera HP
        .resize({
          width: this.MAX_DIMENSION,
          height: this.MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: this.JPEG_QUALITY,
          mozjpeg: true,
        })
        .toBuffer();

      const optimizedSize = resizedBuffer.length;
      const reductionPercent = Math.round((1 - optimizedSize / originalSize) * 100);

      mediaLogger.info(
        `Optimasi foto media sukses: ${Math.round(originalSize / 1024)}KB -> ${Math.round(
          optimizedSize / 1024
        )}KB (-${reductionPercent}%) [max: ${this.MAX_DIMENSION}px]`,
        { originalSize, optimizedSize, reductionPercent }
      );

      return {
        buffer: resizedBuffer,
        base64: resizedBuffer.toString('base64'),
        mimeType: 'image/jpeg',
        wasOptimized: true,
      };
    } catch (err: any) {
      mediaLogger.warn(`Gagal mengoptimasi gambar dengan sharp: ${err.message}. Menggunakan buffer asli.`, {
        originalSize,
      });

      return {
        buffer: inputBuffer,
        base64: inputBuffer.toString('base64'),
        mimeType: originalMime,
        wasOptimized: false,
      };
    }
  }
}
