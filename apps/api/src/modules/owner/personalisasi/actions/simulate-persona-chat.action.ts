import { Tx } from "../../../../db/client";
import { ContextLoader } from "../../../chat/pipeline/context-loader";
import { PresetResolver } from "../../../chat/pipeline/preset-resolver";
import { DiscussionOrchestrator } from "../../../chat/pipeline/discussion-orchestrator";

export interface SimulatePersonaChatInput {
  persona: "assistant" | "admin";
  message: string;
}

export interface SimulatePersonaChatResult {
  reply_text: string;
  model_name: string;
  model_id: string;
  persona: "assistant" | "admin";
  bot_name: string;
}

/**
 * Menjalankan simulasi chat AI secara nyata untuk pratinjau persona
 * tanpa menyimpan pesan ke histori chat publik atau mengirim via WhatsApp.
 */
export async function simulatePersonaChat(
  tx: Tx,
  ownerId: string,
  userId: string,
  input: SimulatePersonaChatInput
): Promise<SimulatePersonaChatResult> {
  const isOwner = input.persona === "assistant";

  // 1. Ambil data pemilik usaha
  const [owner] = await tx<{
    business_name: string;
    business_type: string;
  }[]>`
    SELECT business_name, business_type
    FROM owners
    WHERE id = ${ownerId}::uuid
    LIMIT 1;
  `;

  const businessName = owner?.business_name || "Bisnis Kami";
  const businessType = owner?.business_type || "usaha";

  // 2. Muat konteks persona, bahasa, dan basis pengetahuan terdaftar
  const chatContext = await ContextLoader.loadChatContext(
    {
      owner_id: ownerId,
      user_id: userId,
      business_name: businessName,
      business_type: businessType,
      owner_status: "active",
    },
    isOwner
  );

  // 3. Resolusi preset model AI aktif untuk persona ini
  const preset = await PresetResolver.resolveRuntimePreset(ownerId, input.persona);
  const botName =
    chatContext.botName || (isOwner ? "Asisten Bisnis" : "Admin Toko");

  // 4. Eksekusi pemanggilan AI nyata melalui DiscussionOrchestrator
  const result = await DiscussionOrchestrator.executeDiscussionLoop({
    userMessage: input.message,
    persona: input.persona,
    owner: {
      owner_id: ownerId,
      business_name: businessName,
      business_type: businessType,
    },
    chatContext: {
      botName,
      knowledgeBaseContext: chatContext.knowledgeBaseContext || "",
      customPersonaPrompt: chatContext.customPersonaPrompt || "",
      responseLanguage: chatContext.responseLanguage,
    },
    memory: {
      recentTurns: [],
    },
    effectiveModel: preset.model_id,
    preset,
  });

  return {
    reply_text: result.reply,
    model_name: preset.display_name,
    model_id: preset.model_id,
    persona: input.persona,
    bot_name: botName,
  };
}
