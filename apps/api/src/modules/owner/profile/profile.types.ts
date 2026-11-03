export interface OwnerProfileRecord {
  id: string;
  business_name: string;
  business_type: string;
  custom_business_type?: string | null;
  business_description?: string | null;
  phone?: string | null;
  onboarding_completed: boolean;
  timezone: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface BotConfigRecord {
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
}

export interface UpdateOwnerProfileInput {
  business_name?: string;
  business_type?: string;
  custom_business_type?: string | null;
  business_description?: string | null;
  phone?: string | null;
  onboarding_completed?: boolean;
  timezone?: string;
}

export interface UpdatedOwnerRecord {
  id: string;
  business_name: string;
  business_type: string;
  custom_business_type?: string | null;
  business_description?: string | null;
  phone?: string | null;
  onboarding_completed: boolean;
  timezone: string;
  status: string;
  updated_at: Date;
}
