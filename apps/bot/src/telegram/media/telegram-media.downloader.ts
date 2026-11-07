import type { Context } from 'grammy';
import { ImageOptimizer, type OptimizedImageResult } from '../../common/media/image-optimizer';
import { telegramLogger } from '../../logs';

export interface DownloadedMediaResult {
  buffer: Buffer;
  base64: string;
  mimeType: string;
}

/**
 * TelegramMediaDownloader:
 * Mengunduh file media (foto struk nota & voice note audio) dari Telegram Bot API,
 * dan mengonversinya menjadi Buffer & Base64 untuk pemrosesan AI.
 */
export class TelegramMediaDownloader {
  private static readonly DOWNLOAD_TIMEOUT_MS = 20000;

  /**
   * Mengunduh buffer biner file dari Telegram Cloud via ctx.api.getFile.
   */
  async downloadFile(
    ctx: Context,
    fileId: string
  ): Promise<{ buffer: Buffer; filePath?: string } | undefined> {
    try {
      const fileInfo = await ctx.api.getFile(fileId);
      if (!fileInfo.file_path) {
        telegramLogger.warn(`File Telegram tidak memiliki file_path valid: ${fileId}`);
        return undefined;
      }

      const botToken = ctx.api.token;
      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TelegramMediaDownloader.DOWNLOAD_TIMEOUT_MS);

      const response = await fetch(downloadUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        telegramLogger.warn(`Gagal mengunduh file Telegram (HTTP ${response.status}): ${fileId}`);
        return undefined;
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        filePath: fileInfo.file_path,
      };
    } catch (err: any) {
      telegramLogger.warn(`Error saat mengunduh berkas Telegram ${fileId}: ${err.message}`);
      return undefined;
    }
  }

  /**
   * Mengunduh foto Telegram dan mengoptimalkannya dengan ImageOptimizer.
   */
  async downloadAndOptimizePhoto(
    ctx: Context,
    fileId: string
  ): Promise<OptimizedImageResult | undefined> {
    const downloaded = await this.downloadFile(ctx, fileId);
    if (!downloaded || !downloaded.buffer) {
      return undefined;
    }

    return await ImageOptimizer.optimize(downloaded.buffer, 'image/jpeg');
  }

  /**
   * Mengunduh rekaman suara (Voice Note) atau file audio Telegram.
   */
  async downloadAudio(
    ctx: Context,
    fileId: string,
    mimeType: string = 'audio/ogg'
  ): Promise<DownloadedMediaResult | undefined> {
    const downloaded = await this.downloadFile(ctx, fileId);
    if (!downloaded || !downloaded.buffer) {
      return undefined;
    }

    return {
      buffer: downloaded.buffer,
      base64: downloaded.buffer.toString('base64'),
      mimeType,
    };
  }
}

export const telegramMediaDownloader = new TelegramMediaDownloader();
