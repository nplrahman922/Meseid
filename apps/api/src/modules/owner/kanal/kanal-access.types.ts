export type ChannelType = "whatsapp" | "telegram";
export type TargetType = "number" | "group";
export type RuleStatus = "active" | "disabled" | "blocked";
export type GroupPersonaMode = "assistant" | "admin";
export type TriggerMode = "mention_or_reply" | "always";

export interface ChannelAccessRule {
  id: string;
  owner_id: string;
  channel: ChannelType;
  target_type: TargetType;
  target_id: string;
  target_name: string;
  custom_label: string | null;
  status: RuleStatus;
  persona_mode: GroupPersonaMode;
  trigger_mode: TriggerMode;
  behavior_summary: string | null;
  behavior_analyzed_at: Date | string | null;
  last_interaction_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  is_owner?: boolean;
}

export interface ListAccessRulesFilter {
  channel?: ChannelType;
  target_type?: TargetType;
  status?: RuleStatus;
  search?: string;
}

export interface UpsertAccessRuleInput {
  channel: ChannelType;
  target_type: TargetType;
  target_id: string;
  target_name?: string;
  custom_label?: string;
  status?: RuleStatus;
  persona_mode?: GroupPersonaMode;
  trigger_mode?: TriggerMode;
}

export interface AnalyzeBehaviorInput {
  channel: ChannelType;
  target_id: string;
  target_type?: TargetType;
  model_id?: string;
}
