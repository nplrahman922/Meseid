import { Tx } from "../../../../db/client";
import { BotConfigRecord } from "../personalisasi.types";

/**
 * Mengambil record konfigurasi bot (bot_configs) untuk owner tertentu.
 */
export async function getPersonalisasi(
  tx: Tx,
  ownerId: string
): Promise<BotConfigRecord | null> {
  const [row] = await tx<BotConfigRecord[]>`
    SELECT id, owner_id, assistant_bot_name, assistant_persona_prompt,
           admin_bot_name, admin_persona_prompt, persona_prompt,
           selected_model_id, customer_access_mode, allowed_contacts,
           allowed_groups, auto_reply_enabled, business_hours,
           created_at, updated_at
    FROM bot_configs
    WHERE owner_id = ${ownerId}::uuid;
  `;
  return row || null;
}
