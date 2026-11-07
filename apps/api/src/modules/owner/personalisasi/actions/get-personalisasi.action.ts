import { Tx } from "../../../../db/client";
import { BotConfigRecord, EnrichedBotConfigRecord } from "../personalisasi.types";
import { extractStyleAndRules } from "../compiler/style-rules-extractor";

/**
 * Mengambil record konfigurasi bot (bot_configs) untuk owner tertentu
 * beserta uraian array gaya bicara dan aturan khusus untuk Asisten & Admin Toko.
 */
export async function getPersonalisasi(
  tx: Tx,
  ownerId: string
): Promise<EnrichedBotConfigRecord | null> {
  const [row] = await tx<BotConfigRecord[]>`
    SELECT id, owner_id, assistant_bot_name, assistant_persona_prompt, assistant_language,
           admin_bot_name, admin_persona_prompt, admin_language, persona_prompt,
           selected_model_id, assistant_model_id, admin_model_id,
           customer_access_mode, allowed_contacts,
           allowed_groups, auto_reply_enabled, business_hours,
           created_at, updated_at
    FROM bot_configs
    WHERE owner_id = ${ownerId}::uuid;
  `;

  if (!row) return null;

  const assistantExtracted = extractStyleAndRules(row.assistant_persona_prompt);
  const adminExtracted = extractStyleAndRules(row.admin_persona_prompt);

  return {
    ...row,
    assistant_speaking_styles: assistantExtracted.styles.length > 0
      ? assistantExtracted.styles
      : ["Solutif", "Sigap", "Informatif"],
    assistant_custom_rules: assistantExtracted.rules,
    admin_speaking_styles: adminExtracted.styles.length > 0
      ? adminExtracted.styles
      : ["Ramah", "Sopan", "Informatif"],
    admin_custom_rules: adminExtracted.rules,
  };
}
