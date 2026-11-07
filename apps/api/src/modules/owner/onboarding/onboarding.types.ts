import { CreateKnowledgeBaseInput } from "../kb/kb.types";

export interface ConnectedBotInput {
  channel: "whatsapp" | "telegram";
  externalAccountId: string;
  sessionRef?: string;
}

export interface PersonalizationInput {
  botName?: string;
  assistantBotName?: string;
  speakingStyles?: string[];
  customRules?: string[];
  assistantSpeakingStyles?: string[];
  assistantCustomRules?: string[];
  storeLanguage?: string;
  assistantLanguage?: string;
  adminPersonaPrompt?: string;
  assistantPersonaPrompt?: string;
}

export interface SubmitOnboardingInput {
  userName?: string;
  businessName: string;
  businessType: "kuliner" | "toko" | "jasa" | "lainnya";
  customCategory?: string;
  businessDescription?: string;
  ownerPhone?: string;
  phoneVerified?: boolean;
  connectedBots?: ConnectedBotInput[];
  personalization?: PersonalizationInput;
  knowledgeBase?: CreateKnowledgeBaseInput[];
}

export interface OnboardingStatusResult {
  onboardingCompleted: boolean;
  businessName: string;
  businessType: string;
  customCategory: string | null;
  businessDescription: string | null;
  phone: string | null;
  connectedChannels: string[];
  kbCount: number;
}

export interface OnboardingDetailResult {
  onboardingCompleted: boolean;
  userName: string;
  businessName: string;
  businessType: string;
  customCategory: string | null;
  businessDescription: string | null;
  ownerPhone: string | null;
  phoneVerified: boolean;
  storeBotName: string;
  assistantBotName: string;
  storeSpeakingStyles: string[];
  storeCustomRules: string[];
  assistantSpeakingStyles: string[];
  assistantCustomRules: string[];
  storeLanguage: string;
  assistantLanguage: string;
  whatsappConnected: boolean;
  telegramToken: string | null;
  telegramVerified?: boolean;
  telegramOwnerChatId?: string | null;
  knowledgeBase: Array<{
    id?: string;
    title: string;
    category: string;
    description: string;
    onlyAssistant: boolean;
  }>;
}
