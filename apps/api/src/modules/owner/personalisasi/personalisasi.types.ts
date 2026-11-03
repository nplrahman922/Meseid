export interface PersonaCompilerInput {
  businessName?: string;
  businessType?: string;
  customCategory?: string;
  businessDescription?: string;
  speakingStyles?: string[];
  customRules?: string[];
  assistantSpeakingStyles?: string[];
  assistantCustomRules?: string[];
}

export interface BotConfigRecord {
  id: string;
  owner_id: string;
  assistant_bot_name: string;
  assistant_persona_prompt: string | null;
  admin_bot_name: string;
  admin_persona_prompt: string | null;
  persona_prompt: string | null;
  selected_model_id: string | null;
  customer_access_mode: string;
  allowed_contacts: any;
  allowed_groups: any;
  auto_reply_enabled: boolean;
  business_hours: any;
  created_at: Date;
  updated_at: Date;
}

export interface UpdatePersonalisasiInput {
  admin_bot_name?: string;
  assistant_bot_name?: string;
  admin_persona_prompt?: string | null;
  assistant_persona_prompt?: string | null;
  persona_prompt?: string | null;
  selected_model_id?: string | null;
  customer_access_mode?: "open" | "whitelist";
  allowed_contacts?: any;
  allowed_groups?: any;
  auto_reply_enabled?: boolean;
  business_hours?: any;
}
