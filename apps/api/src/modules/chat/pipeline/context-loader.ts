import { withOwnerContext } from "../../../db/client";
import type { ChannelOwnerResolution } from "./owner-resolver";

export interface LoadedChatContext {
  botName?: string;
  customPersonaPrompt?: string;
  knowledgeBaseContext?: string;
  responseLanguage?: string;
}

export class ContextLoader {
  /**
   * Mengambil nama bot, persona prompt kustom, preferensi bahasa, dan basis pengetahuan resmi usaha dari database PostgreSQL.
   * Multi-tenant RLS compliance: query dijalankan di dalam withOwnerContext.
   */
  static async loadChatContext(
    owner: ChannelOwnerResolution,
    isOwner: boolean
  ): Promise<LoadedChatContext> {
    let botName: string | undefined;
    let customPersonaPrompt: string | undefined;
    let knowledgeBaseContext: string | undefined;
    let responseLanguage: string | undefined;

    await withOwnerContext(owner.owner_id, owner.user_id, async (tx) => {
      const [botConfig] = await tx<{
        assistant_bot_name: string | null;
        admin_bot_name: string | null;
        admin_persona_prompt: string | null;
        assistant_persona_prompt: string | null;
        admin_language: string | null;
        assistant_language: string | null;
      }[]>`
        SELECT assistant_bot_name, admin_bot_name, admin_persona_prompt, assistant_persona_prompt,
               admin_language, assistant_language
        FROM bot_configs
        WHERE owner_id = ${owner.owner_id}::uuid
        LIMIT 1;
      `;

      if (botConfig) {
        botName = isOwner
          ? botConfig.assistant_bot_name || "Asisten Bisnis"
          : botConfig.admin_bot_name || "Admin Toko";
        customPersonaPrompt = isOwner
          ? botConfig.assistant_persona_prompt || undefined
          : botConfig.admin_persona_prompt || undefined;
        responseLanguage = isOwner
          ? botConfig.assistant_language || "auto"
          : botConfig.admin_language || "auto";
      }

      const kbRows = await tx<{ category: string; title: string; content: string }[]>`
        SELECT category, title, content
        FROM knowledge_base
        WHERE owner_id = ${owner.owner_id}::uuid
          AND (${isOwner ? tx`true` : tx`is_internal = false`})
        ORDER BY created_at ASC;
      `;

      if (kbRows.length > 0) {
        knowledgeBaseContext = kbRows
          .map((kb) => `• [${kb.category.toUpperCase()}] ${kb.title}: ${kb.content}`)
          .join("\n");
      }
    });

    return {
      botName,
      customPersonaPrompt,
      knowledgeBaseContext,
      responseLanguage,
    };
  }
}
