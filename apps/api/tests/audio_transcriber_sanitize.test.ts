import { describe, it, expect } from "bun:test";
import { sanitizeAudioMimeType } from "../src/adapters/ai/audio/audio-transcriber";

describe("Unit Test: sanitizeAudioMimeType", () => {
  it("membersihkan WhatsApp OGG Opus dengan parameter codecs", () => {
    expect(sanitizeAudioMimeType("audio/ogg; codecs=opus")).toBe("audio/ogg");
    expect(sanitizeAudioMimeType("audio/ogg;codecs=opus")).toBe("audio/ogg");
  });

  it("membersihkan MIME type audio lainnya dengan parameter", () => {
    expect(sanitizeAudioMimeType("audio/wav; codec=pcm")).toBe("audio/wav");
    expect(sanitizeAudioMimeType("audio/mp4; codecs=\"mp4a.40.2\"")).toBe("audio/mp4");
    expect(sanitizeAudioMimeType("audio/webm; codecs=opus")).toBe("audio/webm");
  });

  it("mempertahankan format audio bersih standar", () => {
    expect(sanitizeAudioMimeType("audio/ogg")).toBe("audio/ogg");
    expect(sanitizeAudioMimeType("audio/wav")).toBe("audio/wav");
    expect(sanitizeAudioMimeType("audio/mp3")).toBe("audio/mp3");
    expect(sanitizeAudioMimeType("audio/mpeg")).toBe("audio/mpeg");
  });

  it("menangani MIME undefined atau tidak dikenal dengan fallback audio/ogg", () => {
    expect(sanitizeAudioMimeType(undefined)).toBe("audio/ogg");
    expect(sanitizeAudioMimeType("")).toBe("audio/ogg");
    expect(sanitizeAudioMimeType("application/octet-stream")).toBe("audio/ogg");
  });
});
