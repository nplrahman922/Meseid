import { Tx } from "../../../../db/client";
import { OwnerProfileRecord, BotConfigRecord } from "../profile.types";

/**
 * Mengambil profil owner dan konfigurasi bot terkait dalam konteks owner aktif.
 */
export async function getOwnerProfileAndBotConfig(
  tx: Tx,
  ownerId: string
): Promise<{
  owner: OwnerProfileRecord;
  botConfig: BotConfigRecord | null;
}> {
  const [ownerDetails] = await tx<OwnerProfileRecord[]>`
    SELECT id, business_name, business_type, custom_business_type, business_description,
           phone, onboarding_completed, timezone, status, created_at, updated_at
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
