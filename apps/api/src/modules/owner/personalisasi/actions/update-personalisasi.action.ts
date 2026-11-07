import { Tx } from "../../../../db/client";
import { BotConfigRecord, UpdatePersonalisasiInput } from "../personalisasi.types";

/**
 * Melakukan upsert / update record konfigurasi bot (bot_configs) untuk owner tertentu.
 */
export async function updatePersonalisasi(
  tx: Tx,
  ownerId: string,
  input: UpdatePersonalisasiInput
): Promise<BotConfigRecord> {
  const assistantPrompt = input.assistant_persona_prompt ?? null;
  const adminPrompt = input.admin_persona_prompt ?? null;
  const personaPrompt = input.persona_prompt ?? null;
  const selectedModelId = input.selected_model_id ?? null;
  const assistantModelId = input.assistant_model_id ?? null;
  const adminModelId = input.admin_model_id ?? null;
  const allowedContacts = input.allowed_contacts ? JSON.stringify(input.allowed_contacts) : null;
  const allowedGroups = input.allowed_groups ? JSON.stringify(input.allowed_groups) : null;
  const businessHours = input.business_hours ? JSON.stringify(input.business_hours) : null;

  const [row] = await tx<BotConfigRecord[]>`
    INSERT INTO bot_configs (
      owner_id,
      assistant_bot_name,
      assistant_persona_prompt,
      assistant_language,
      admin_bot_name,
      admin_persona_prompt,
      admin_language,
      persona_prompt,
      selected_model_id,
      assistant_model_id,
      admin_model_id,
      customer_access_mode,
      allowed_contacts,
      allowed_groups,
      auto_reply_enabled,
      business_hours
    )
    VALUES (
      ${ownerId}::uuid,
      COALESCE(${input.assistant_bot_name || null}, 'Asisten Bisnis'),
      ${assistantPrompt},
      COALESCE(${input.assistant_language || null}, 'auto'),
      COALESCE(${input.admin_bot_name || null}, 'Admin Toko'),
      ${adminPrompt},
      COALESCE(${input.admin_language || null}, 'auto'),
      ${personaPrompt},
      ${selectedModelId},
      ${assistantModelId},
      ${adminModelId},
      COALESCE(${input.customer_access_mode || null}, 'open'),
      COALESCE(${allowedContacts}::jsonb, '[]'::jsonb),
      COALESCE(${allowedGroups}::jsonb, '[]'::jsonb),
      COALESCE(${input.auto_reply_enabled !== undefined ? input.auto_reply_enabled : null}, true),
      COALESCE(${businessHours}::jsonb, '{}'::jsonb)
    )
    ON CONFLICT (owner_id) DO UPDATE
    SET assistant_bot_name = COALESCE(${input.assistant_bot_name || null}, bot_configs.assistant_bot_name),
        assistant_persona_prompt = CASE WHEN ${input.assistant_persona_prompt !== undefined} THEN ${assistantPrompt} ELSE bot_configs.assistant_persona_prompt END,
        assistant_language = COALESCE(${input.assistant_language || null}, bot_configs.assistant_language),
        admin_bot_name = COALESCE(${input.admin_bot_name || null}, bot_configs.admin_bot_name),
        admin_persona_prompt = CASE WHEN ${input.admin_persona_prompt !== undefined} THEN ${adminPrompt} ELSE bot_configs.admin_persona_prompt END,
        admin_language = COALESCE(${input.admin_language || null}, bot_configs.admin_language),
        persona_prompt = CASE WHEN ${input.persona_prompt !== undefined} THEN ${personaPrompt} ELSE bot_configs.persona_prompt END,
        selected_model_id = CASE WHEN ${input.selected_model_id !== undefined} THEN ${selectedModelId} ELSE bot_configs.selected_model_id END,
        assistant_model_id = CASE WHEN ${input.assistant_model_id !== undefined} THEN ${assistantModelId} ELSE bot_configs.assistant_model_id END,
        admin_model_id = CASE WHEN ${input.admin_model_id !== undefined} THEN ${adminModelId} ELSE bot_configs.admin_model_id END,
        customer_access_mode = COALESCE(${input.customer_access_mode || null}, bot_configs.customer_access_mode),
        allowed_contacts = CASE WHEN ${input.allowed_contacts !== undefined} THEN ${allowedContacts}::jsonb ELSE bot_configs.allowed_contacts END,
        allowed_groups = CASE WHEN ${input.allowed_groups !== undefined} THEN ${allowedGroups}::jsonb ELSE bot_configs.allowed_groups END,
        auto_reply_enabled = COALESCE(${input.auto_reply_enabled !== undefined ? input.auto_reply_enabled : null}, bot_configs.auto_reply_enabled),
        business_hours = CASE WHEN ${input.business_hours !== undefined} THEN ${businessHours}::jsonb ELSE bot_configs.business_hours END,
        updated_at = now()
    RETURNING id, owner_id, assistant_bot_name, assistant_persona_prompt, assistant_language,
              admin_bot_name, admin_persona_prompt, admin_language, persona_prompt,
              selected_model_id, assistant_model_id, admin_model_id,
              customer_access_mode, allowed_contacts,
              allowed_groups, auto_reply_enabled, business_hours,
              created_at, updated_at;
  `;

  return row;
}
