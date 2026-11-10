export type ModerationCategory = "sara" | "profanity" | "spam" | "custom";

export interface ModerationMatch {
  isViolation: boolean;
  category?: ModerationCategory;
  matchedWord?: string;
  normalizedText?: string;
}

export interface ModerationInspectionInput {
  text: string;
  senderName?: string;
  channel?: "whatsapp" | "telegram";
  isGroup?: boolean;
  customBannedWords?: string[];
  moderationEnabled?: boolean;
}

export interface ModerationInspectionResult {
  isViolation: boolean;
  category?: ModerationCategory;
  matchedWord?: string;
  warningReply?: string;
}
