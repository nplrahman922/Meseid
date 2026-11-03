import { Tx } from "../../../../db/client";
import { OnboardingDetailResult } from "../onboarding.types";

/**
 * Operasi Query detail konfigurasi lengkap onboarding dari database untuk Pre-fill halaman Overview.
 */
export async function getOnboardingDetail(
  tx: Tx,
  ownerId: string
): Promise<OnboardingDetailResult> {
  const [owner] = await tx`
    SELECT o.business_name, o.business_type, o.custom_business_type, o.business_description,
           o.phone, o.onboarding_completed, o.owner_name, u.email as user_email
    FROM owners o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ${ownerId}::uuid;
  `;

  const [botConfig] = await tx`
    SELECT admin_bot_name, assistant_bot_name, admin_persona_prompt, assistant_persona_prompt
    FROM bot_configs
    WHERE owner_id = ${ownerId}::uuid;
  `;

  const channels = await tx<{ channel: string; external_account_id: string }[]>`
    SELECT channel, external_account_id
    FROM channel_connections
    WHERE owner_id = ${ownerId}::uuid AND status = 'connected';
  `;

  const kbRows = await tx<{
    id: string;
    title: string;
    category: string;
    content: string;
    is_internal: boolean;
  }[]>`
    SELECT id, title, category, content, is_internal
    FROM knowledge_base
    WHERE owner_id = ${ownerId}::uuid
    ORDER BY created_at ASC;
  `;

  const hasWhatsapp = channels.some((c) => c.channel === "whatsapp");
  const tgChannel = channels.find((c) => c.channel === "telegram");

  let storeSpeakingStyles: string[] = ["Ramah", "Informatif"];
  let storeCustomRules: string[] = [];
  let assistantSpeakingStyles: string[] = ["Ramah", "Informatif"];
  let assistantCustomRules: string[] = [];

  const extractStyleAndRules = (prompt?: string | null) => {
    if (!prompt) return { styles: [], rules: [] };
    const styleMatch = prompt.match(/Gaya Bicara:\s*([^.]+)\./i);
    const rulesMatch = prompt.match(/Aturan Khusus:\s*([^.]+)\./i);
    const styles = styleMatch && styleMatch[1] ? styleMatch[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
    const rules = rulesMatch && rulesMatch[1] ? rulesMatch[1].split(";").map((r) => r.trim()).filter(Boolean) : [];
    return { styles, rules };
  };

  if (botConfig?.admin_persona_prompt) {
    const extracted = extractStyleAndRules(botConfig.admin_persona_prompt);
    if (extracted.styles.length > 0) storeSpeakingStyles = extracted.styles;
    if (extracted.rules.length > 0) storeCustomRules = extracted.rules;
  }

  if (botConfig?.assistant_persona_prompt) {
    const extracted = extractStyleAndRules(botConfig.assistant_persona_prompt);
    if (extracted.styles.length > 0) assistantSpeakingStyles = extracted.styles;
    if (extracted.rules.length > 0) assistantCustomRules = extracted.rules;
  }

  return {
    onboardingCompleted: owner?.onboarding_completed ?? false,
    userName: owner?.owner_name || (owner?.user_email ? owner.user_email.split("@")[0] : ""),
    businessName: owner?.business_name || "",
    businessType: owner?.business_type || "kuliner",
    customCategory: owner?.custom_business_type || null,
    businessDescription: owner?.business_description || null,
    ownerPhone: owner?.phone || null,
    phoneVerified: Boolean(owner?.phone),
    storeBotName: botConfig?.admin_bot_name || "Admin Toko",
    assistantBotName: botConfig?.assistant_bot_name || "Asisten Bisnis",
    storeSpeakingStyles,
    storeCustomRules,
    assistantSpeakingStyles,
    assistantCustomRules,
    whatsappConnected: hasWhatsapp,
    telegramToken: tgChannel ? tgChannel.external_account_id : null,
    knowledgeBase: kbRows.map((kb) => ({
      id: kb.id,
      title: kb.title,
      category: kb.category,
      description: kb.content,
      onlyAssistant: kb.is_internal,
    })),
  };
}
