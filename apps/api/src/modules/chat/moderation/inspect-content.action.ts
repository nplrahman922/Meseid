import { SARA_LEXICON, PROFANITY_LEXICON, SPAM_PROMO_LEXICON } from "./lexicons";
import { TextNormalizer } from "./text-normalizer";
import { WarningFormatter } from "./warning-formatter";
import type { ModerationInspectionInput, ModerationInspectionResult } from "./moderation.types";

/**
 * Aksi Pemeriksaan Konten & Moderasi Teks Cepat (< 0.1 ms)
 */
export class InspectContentAction {
  static execute(input: ModerationInspectionInput): ModerationInspectionResult {
    if (!input.text || input.moderationEnabled === false) {
      return { isViolation: false };
    }

    const normalized = TextNormalizer.normalize(input.text);

    // 1. Prioritas Utama: Kata Terlarang Kustom Owner
    if (input.customBannedWords && input.customBannedWords.length > 0) {
      for (const banned of input.customBannedWords) {
        const cleanBanned = TextNormalizer.normalize(banned).trim();
        if (cleanBanned && this.matchesPattern(normalized, cleanBanned)) {
          return {
            isViolation: true,
            category: "custom",
            matchedWord: banned,
            warningReply: WarningFormatter.formatWarning("custom", input.senderName),
          };
        }
      }
    }

    // 2. Cek SARA & Ujaran Kebencian
    for (const word of SARA_LEXICON) {
      if (this.matchesPattern(normalized, word)) {
        return {
          isViolation: true,
          category: "sara",
          matchedWord: word,
          warningReply: WarningFormatter.formatWarning("sara", input.senderName),
        };
      }
    }

    // 3. Cek Spam & Judi Online
    for (const word of SPAM_PROMO_LEXICON) {
      if (this.matchesPattern(normalized, word)) {
        return {
          isViolation: true,
          category: "spam",
          matchedWord: word,
          warningReply: WarningFormatter.formatWarning("spam", input.senderName),
        };
      }
    }

    // 4. Cek Kata Kasar & Vulgar
    for (const word of PROFANITY_LEXICON) {
      if (this.matchesPattern(normalized, word)) {
        return {
          isViolation: true,
          category: "profanity",
          matchedWord: word,
          warningReply: WarningFormatter.formatWarning("profanity", input.senderName),
        };
      }
    }

    return { isViolation: false };
  }

  private static matchesPattern(text: string, pattern: string): boolean {
    if (pattern.includes(" ")) {
      if (text.includes(pattern)) return true;
      const patternNoSpace = pattern.replaceAll(/\s+/g, "");
      const textNoSpace = text.replaceAll(/\s+/g, "");
      if (patternNoSpace.length >= 5 && textNoSpace.includes(patternNoSpace)) {
        return true;
      }
    } else {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
      if (regex.test(text)) return true;
    }
    return false;
  }
}
