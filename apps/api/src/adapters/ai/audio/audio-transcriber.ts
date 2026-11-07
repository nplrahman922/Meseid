import { createModuleLogger } from "../../../logs";

const audioLogger = createModuleLogger("audio-transcriber");

export interface AudioTranscribeOptions {
  audioBase64: string;
  mimeType?: string;
  modelId?: string;
}

/**
 * Membersihkan MIME type audio dari parameter tambahan seperti '; codecs=opus'
 * yang menyebabkan OpenAI Whisper / Vercel AI Gateway menolak dengan HTTP 400.
 */
export function sanitizeAudioMimeType(rawMime?: string): string {
  if (!rawMime) return "audio/ogg";
  const clean = rawMime.split(";")[0].trim().toLowerCase();

  const supportedFormats = [
    "audio/ogg",
    "audio/opus",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/m4a",
    "audio/mp4",
    "audio/webm",
    "audio/flac",
  ];

  if (supportedFormats.includes(clean)) {
    return clean;
  }

  return "audio/ogg";
}

/**
 * AudioTranscriber:
 * Mentranskripsikan rekaman suara / voice notes WhatsApp & Telegram menjadi teks
 * menggunakan Vercel AI Gateway Speech-to-Text (openai/gpt-4o-transcribe).
 */
export class AudioTranscriber {
  private static readonly GATEWAY_URL = "https://ai-gateway.vercel.sh/v4/ai/transcription-model";
  private static readonly DEFAULT_TRANSCRIBE_MODEL = "openai/gpt-4o-transcribe";

  static async transcribeAudio(options: AudioTranscribeOptions): Promise<string> {
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    if (!apiKey) {
      audioLogger.warn("AI_PROVIDER_API_KEY tidak dikonfigurasi. Transkripsi suara dilewati.");
      return "";
    }

    const startTime = Date.now();
    const mediaType = sanitizeAudioMimeType(options.mimeType);
    const model = options.modelId || this.DEFAULT_TRANSCRIBE_MODEL;

    try {
      const res = await fetch(this.GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "ai-gateway-protocol-version": "0.0.1",
          "ai-model-id": model,
        },
        body: JSON.stringify({
          audio: options.audioBase64,
          mediaType,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        audioLogger.warn(`Gateway transcription gagal: ${res.status} - ${errBody}`);
        return "";
      }

      const json = (await res.json()) as { text?: string };
      const transcript = json.text?.trim() || "";

      audioLogger.info(`Transkripsi audio berhasil dalam ${Date.now() - startTime}ms: "${transcript}"`, {
        model,
        transcriptLength: transcript.length,
      });

      return transcript;
    } catch (err: any) {
      audioLogger.error(`Kendala jaringan saat transkripsi audio: ${err.message}`, err);
      return "";
    }
  }
}
