import { Tx } from "../../../../db/client";
import { compilePersonaPrompt } from "../../personalisasi/personalisasi.model";
import { batchInsertKnowledgeBase } from "../../kb/kb.model";
import { SubmitOnboardingInput } from "../onboarding.types";

/**
 * Operasi Transaksi Eksekusi Onboarding lengkap:
 * Menyimpan profil bisnis, bot_configs persona, koneksi bot, dan clean sync knowledge base.
 */
export async function executeOnboardingTransaction(
  tx: Tx,
  ownerId: string,
  input: SubmitOnboardingInput
): Promise<{
  ownerId: string;
  businessName: string;
  businessType: string;
  onboardingCompleted: boolean;
  kbCount: number;
}> {
  // 1. Update owner identity
  const [updatedOwner] = await tx`
    UPDATE owners
    SET business_name = ${input.businessName.trim()},
        business_type = ${input.businessType},
        custom_business_type = ${input.customCategory?.trim() || null},
        business_description = ${input.businessDescription?.trim() || null},
        phone = ${input.ownerPhone?.trim() || null},
        onboarding_completed = true,
        updated_at = now()
    WHERE id = ${ownerId}::uuid
    RETURNING id, business_name, business_type;
  `;

  // 2. Upsert connected bots if any
  if (input.connectedBots && input.connectedBots.length > 0) {
    for (const bot of input.connectedBots) {
      if (bot.externalAccountId) {
        await tx`
          INSERT INTO channel_connections (
            owner_id,
            channel,
            external_account_id,
            status,
            session_ref
          )
          VALUES (
            ${ownerId}::uuid,
            ${bot.channel},
            ${bot.externalAccountId.trim()},
            'connected',
            ${bot.sessionRef || null}
          )
          ON CONFLICT (channel, external_account_id) DO UPDATE
          SET owner_id = ${ownerId}::uuid,
              status = 'connected',
              session_ref = COALESCE(${bot.sessionRef || null}, channel_connections.session_ref),
              updated_at = now();
        `;
      }
    }
  }

  // 3. Compile and update bot configurations
  if (input.personalization) {
    const p = input.personalization;
    let adminPrompt = p.adminPersonaPrompt;
    let assistantPrompt = p.assistantPersonaPrompt;

    if (!adminPrompt || !assistantPrompt) {
      const compiled = compilePersonaPrompt({
        businessName: input.businessName,
        businessType: input.businessType,
        customCategory: input.customCategory,
        businessDescription: input.businessDescription,
        speakingStyles: p.speakingStyles,
        customRules: p.customRules,
        assistantSpeakingStyles: p.assistantSpeakingStyles,
        assistantCustomRules: p.assistantCustomRules,
      });
      if (!adminPrompt) adminPrompt = compiled.adminPersonaPrompt;
      if (!assistantPrompt) assistantPrompt = compiled.assistantPersonaPrompt;
    }

    const adminBotName = p.botName?.trim() || "Admin Toko";
    const assistantBotName = p.assistantBotName?.trim() || "Asisten Bisnis";

    await tx`
      INSERT INTO bot_configs (
        owner_id,
        admin_bot_name,
        assistant_bot_name,
        admin_persona_prompt,
        assistant_persona_prompt,
        auto_reply_enabled
      )
      VALUES (
        ${ownerId}::uuid,
        ${adminBotName},
        ${assistantBotName},
        ${adminPrompt},
        ${assistantPrompt},
        true
      )
      ON CONFLICT (owner_id) DO UPDATE
      SET admin_bot_name = ${adminBotName},
          assistant_bot_name = ${assistantBotName},
          admin_persona_prompt = ${adminPrompt},
          assistant_persona_prompt = ${assistantPrompt},
          auto_reply_enabled = true,
          updated_at = now();
    `;
  }

  // 4. Clean Sync Knowledge Base (Anti-Menumpuk)
  let kbCount = 0;
  if (Array.isArray(input.knowledgeBase)) {
    await tx`DELETE FROM knowledge_base WHERE owner_id = ${ownerId}::uuid;`;

    const validKbItems = input.knowledgeBase.filter(
      (item) => item.title && item.title.trim().length > 0 && item.content && item.content.trim().length > 0
    );
    if (validKbItems.length > 0) {
      const inserted = await batchInsertKnowledgeBase(tx, ownerId, validKbItems);
      kbCount = inserted.length;
    }
  }

  return {
    ownerId: updatedOwner.id,
    businessName: updatedOwner.business_name,
    businessType: updatedOwner.business_type,
    onboardingCompleted: true,
    kbCount,
  };
}
