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
        owner_name = ${input.userName?.trim() || null},
        business_type = ${input.businessType},
        custom_business_type = ${input.customCategory?.trim() || null},
        business_description = ${input.businessDescription?.trim() || null},
        phone = ${input.ownerPhone?.trim() || null},
        onboarding_completed = true,
        updated_at = now()
    WHERE id = ${ownerId}::uuid
    RETURNING id, business_name, business_type;
  `;

  // 2. Upsert connected bots if any (dengan validasi anti-rebut kepemilikan antar owner)
  if (input.connectedBots && input.connectedBots.length > 0) {
    for (const bot of input.connectedBots) {
      if (bot.externalAccountId) {
        const cleanAccountId = bot.externalAccountId.trim();

        // Verifikasi apakah akun channel sudah terikat ke owner lain
        const existingConnections = await tx<{ owner_id: string }[]>`
          SELECT owner_id FROM channel_connections
          WHERE channel = ${bot.channel}
            AND external_account_id = ${cleanAccountId}
          LIMIT 1;
        `;

        if (existingConnections.length > 0 && existingConnections[0].owner_id !== ownerId) {
          throw new Error(
            `Akun / Nomor ${bot.channel} '${cleanAccountId}' sudah terdaftar pada akun bisnis lain. Silakan putuskan koneksi dari akun sebelumnya terlebih dahulu.`
          );
        }

        if (bot.channel === "telegram") {
          // Bersihkan row duplikat telegram lama (misal yang hanya nomor botId) untuk owner ini
          await tx`
            DELETE FROM channel_connections
            WHERE owner_id = ${ownerId}::uuid
              AND channel = 'telegram'
              AND external_account_id != ${cleanAccountId};
          `;
        }

        // Tentukan session_ref terisolasi per owner
        const resolvedSessionRef =
          bot.channel === "whatsapp"
            ? (bot.sessionRef && bot.sessionRef !== "default" ? bot.sessionRef : `owner_${ownerId.replace(/-/g, "_")}`)
            : (bot.sessionRef || null);

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
            ${cleanAccountId},
            'connected',
            ${resolvedSessionRef}
          )
          ON CONFLICT (channel, external_account_id) DO UPDATE
          SET status = 'connected',
              session_ref = COALESCE(${resolvedSessionRef}, channel_connections.session_ref),
              updated_at = now()
          WHERE channel_connections.owner_id = ${ownerId}::uuid;
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
    const adminLanguage = p.storeLanguage?.trim() || "auto";
    const assistantLanguage = p.assistantLanguage?.trim() || "auto";

    await tx`
      INSERT INTO bot_configs (
        owner_id,
        admin_bot_name,
        assistant_bot_name,
        admin_persona_prompt,
        assistant_persona_prompt,
        admin_language,
        assistant_language,
        auto_reply_enabled
      )
      VALUES (
        ${ownerId}::uuid,
        ${adminBotName},
        ${assistantBotName},
        ${adminPrompt},
        ${assistantPrompt},
        ${adminLanguage},
        ${assistantLanguage},
        true
      )
      ON CONFLICT (owner_id) DO UPDATE
      SET admin_bot_name = ${adminBotName},
          assistant_bot_name = ${assistantBotName},
          admin_persona_prompt = ${adminPrompt},
          assistant_persona_prompt = ${assistantPrompt},
          admin_language = ${adminLanguage},
          assistant_language = ${assistantLanguage},
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
