import { describe, expect, it } from "bun:test";
import { InspectContentAction } from "../../src/modules/chat/moderation/inspect-content.action";
import { TextNormalizer } from "../../src/modules/chat/moderation/text-normalizer";

describe("ContentModerator & Anti-SARA Guard Tests", () => {
  it("harus meloloskan percakapan bisnis yang normal dan sopan", () => {
    const result = InspectContentAction.execute({
      text: "Halo kak, mau tanya apakah paket bundling kopi susu masih ready?",
      senderName: "Budi",
      isGroup: true,
    });

    expect(result.isViolation).toBe(false);
    expect(result.warningReply).toBeUndefined();
  });

  it("harus mendeteksi ujaran SARA langsung", () => {
    const result = InspectContentAction.execute({
      text: "Dasar penista agama lu semua!",
      senderName: "Pelanggar1",
      isGroup: true,
    });

    expect(result.isViolation).toBe(true);
    expect(result.category).toBe("sara");
    expect(result.warningReply).toContain("Peringatan untuk @Pelanggar1");
    expect(result.warningReply).toContain("SARA");
  });

  it("harus mendeteksi kata kasar yang diakali leetspeak (@njing)", () => {
    const normalized = TextNormalizer.normalize("@njing lo!");
    expect(normalized).toContain("anjing");

    const result = InspectContentAction.execute({
      text: "Woi @njing lo!",
      senderName: "TukangRusuh",
      isGroup: true,
    });

    expect(result.isViolation).toBe(true);
    expect(result.category).toBe("profanity");
    expect(result.warningReply).toContain("Pemberitahuan untuk @TukangRusuh");
  });

  it("harus mendeteksi spam judi yang diakali spasi (s l o t  g a c o r)", () => {
    const result = InspectContentAction.execute({
      text: "Gabung yuk s l o t g a c o r modal 10rb langsung cair",
      senderName: "BotSpam",
      isGroup: true,
    });

    expect(result.isViolation).toBe(true);
    expect(result.category).toBe("spam");
    expect(result.warningReply).toContain("Dilarang mengirimkan promosi, tautan spam");
  });

  it("harus mendeteksi kata terlarang kustom pilihan owner", () => {
    const result = InspectContentAction.execute({
      text: "Kayaknya di TokoSebelah lebih murah deh gan",
      senderName: "CalonBuyer",
      isGroup: true,
      customBannedWords: ["tokosebelah", "warungtetangga"],
    });

    expect(result.isViolation).toBe(true);
    expect(result.category).toBe("custom");
    expect(result.matchedWord).toBe("tokosebelah");
    expect(result.warningReply).toContain("kebijakan Owner");
  });
});
