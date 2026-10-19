import { Tx } from "../../db/client";

export interface OwnerProfileRecord {
  id: string;
  business_name: string;
  business_type: string;
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
  timezone?: string;
}

export interface UpdatedOwnerRecord {
  id: string;
  business_name: string;
  business_type: string;
  timezone: string;
  status: string;
  updated_at: Date;
}

/**
 * Retrieves the owner's profile details and associated bot configuration
 * within an active owner context transaction.
 */
export async function getOwnerProfileAndBotConfig(
  tx: Tx,
  ownerId: string
): Promise<{
  owner: OwnerProfileRecord;
  botConfig: BotConfigRecord | null;
}> {
  const [ownerDetails] = await tx<OwnerProfileRecord[]>`
    SELECT id, business_name, business_type, timezone, status, created_at, updated_at
    FROM owners
    WHERE id = ${ownerId}::uuid;
  `;

  const [botConfig] = await tx<BotConfigRecord[]>`
    SELECT assistant_bot_name, assistant_persona_prompt, admin_bot_name, admin_persona_prompt,
           persona_prompt, selected_model_id, customer_access_mode, allowed_contacts, allowed_groups,
           auto_reply_enabled, business_hours
    FROM bot_configs
    WHERE owner_id = ${ownerId}::uuid;
  `;

  return {
    owner: ownerDetails,
    botConfig: botConfig || null,
  };
}

/**
 * Updates the owner's business name, business type, or timezone.
 */
export async function updateOwnerProfile(
  tx: Tx,
  ownerId: string,
  data: UpdateOwnerProfileInput
): Promise<UpdatedOwnerRecord> {
  const [updated] = await tx<UpdatedOwnerRecord[]>`
    UPDATE owners
    SET business_name = COALESCE(${data.business_name?.trim() || null}, business_name),
        business_type = COALESCE(${data.business_type || null}, business_type),
        timezone = COALESCE(${data.timezone || null}, timezone),
        updated_at = now()
    WHERE id = ${ownerId}::uuid
    RETURNING id, business_name, business_type, timezone, status, updated_at;
  `;

  return updated;
}

/**
 * Invokes the database stored function `delete_owner_data` to purge
 * all tenant-owned data in compliance with UU PDP Right to Erasure.
 */
export async function deleteOwnerData(
  tx: Tx,
  ownerId: string
): Promise<void> {
  await tx`SELECT delete_owner_data(${ownerId}::uuid);`;
}
