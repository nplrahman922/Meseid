import { Tx } from "../../../../db/client";
import { OnboardingDetailResult } from "../onboarding.types";
import { extractStyleAndRules } from "../../personalisasi/compiler/style-rules-extractor";

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
    SELECT admin_bot_name, assistant_bot_name, admin_persona_prompt, assistant_persona_prompt,
           admin_language, assistant_language, allowed_contacts
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
  const tgChannels = channels.filter((c) => c.channel === "telegram");
  const tgChannel = tgChannels.find((c) => c.external_account_id.includes(":")) || tgChannels[0];

  let storeSpeakingStyles: string[] = ["Ramah", "Informatif"];
  let storeCustomRules: string[] = [];
  let assistantSpeakingStyles: string[] = ["Ramah", "Informatif"];
  let assistantCustomRules: string[] = [];

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
    storeLanguage: botConfig?.admin_language || "auto",
    assistantLanguage: botConfig?.assistant_language || "auto",
    whatsappConnected: hasWhatsapp,
    telegramToken: tgChannel ? tgChannel.external_account_id : null,
    telegramVerified: Boolean(tgChannel && Array.isArray(botConfig?.allowed_contacts) && botConfig.allowed_contacts.length > 0),
    telegramOwnerChatId: (tgChannel && Array.isArray(botConfig?.allowed_contacts) && botConfig.allowed_contacts[0]) ? String(botConfig.allowed_contacts[0]) : null,
    knowledgeBase: kbRows.map((kb) => ({
      id: kb.id,
      title: kb.title,
      category: kb.category,
      description: kb.content,
      onlyAssistant: kb.is_internal,
    })),
  };
}
