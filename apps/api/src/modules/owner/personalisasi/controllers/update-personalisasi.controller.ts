import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { compilePersonaPrompt } from "../compiler/persona-compiler";
import { updatePersonalisasi } from "../actions/update-personalisasi.action";
import { validatePresetTierAccessAction } from "../presets/actions/validate-preset-tier-access.action";
import { ModelAccessError } from "../presets/model-access.error";

/**
 * Controller untuk PUT /api/owner/personalisasi
 */
export async function updatePersonalisasiController({
  body,
  owner,
  runOwnerTx,
  set,
}: {
  body: {
    admin_bot_name?: string;
    assistant_bot_name?: string;
    admin_persona_prompt?: string;
    assistant_persona_prompt?: string;
    speaking_styles?: string[];
    custom_rules?: string[];
    assistant_speaking_styles?: string[];
    assistant_custom_rules?: string[];
    admin_language?: string;
    assistant_language?: string;
    selected_model_id?: string | null;
    assistant_model_id?: string | null;
    admin_model_id?: string | null;
    customer_access_mode?: "open" | "whitelist";
    allowed_contacts?: any;
    allowed_groups?: any;
    auto_reply_enabled?: boolean;
    business_hours?: any;
    banned_words?: string[];
    group_moderation_enabled?: boolean;
  };
  owner: { id: string; businessName: string; businessType: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  let adminPrompt = body.admin_persona_prompt;
  let assistantPrompt = body.assistant_persona_prompt;

  if (
    (!adminPrompt || !assistantPrompt) &&
    (body.speaking_styles || body.custom_rules || body.assistant_speaking_styles || body.assistant_custom_rules)
  ) {
    const compiled = compilePersonaPrompt({
      businessName: owner.businessName,
      businessType: owner.businessType,
      speakingStyles: body.speaking_styles,
      customRules: body.custom_rules,
      assistantSpeakingStyles: body.assistant_speaking_styles,
      assistantCustomRules: body.assistant_custom_rules,
    });
    if (!adminPrompt) adminPrompt = compiled.adminPersonaPrompt;
    if (!assistantPrompt) assistantPrompt = compiled.assistantPersonaPrompt;
  }

  try {
    const updated = await runOwnerTx(async (tx) => {
      let resolvedModelId: string | null | undefined = body.selected_model_id;
      let resolvedAssistantModelId: string | null | undefined = body.assistant_model_id;
      let resolvedAdminModelId: string | null | undefined = body.admin_model_id;

      if (body.selected_model_id !== undefined && body.selected_model_id !== null) {
        const { preset } = await validatePresetTierAccessAction(tx, owner.id, body.selected_model_id);
        // Simpan model_id yang sah sesuai foreign key ai_models
        resolvedModelId = preset.model_id;
      }

      if (body.assistant_model_id !== undefined && body.assistant_model_id !== null) {
        const { preset } = await validatePresetTierAccessAction(tx, owner.id, body.assistant_model_id);
        resolvedAssistantModelId = preset.model_id;
      }

      if (body.admin_model_id !== undefined && body.admin_model_id !== null) {
        const { preset } = await validatePresetTierAccessAction(tx, owner.id, body.admin_model_id);
        resolvedAdminModelId = preset.model_id;
      }

      return await updatePersonalisasi(tx, owner.id, {
        admin_bot_name: body.admin_bot_name,
        assistant_bot_name: body.assistant_bot_name,
        admin_persona_prompt: adminPrompt,
        assistant_persona_prompt: assistantPrompt,
        admin_language: body.admin_language,
        assistant_language: body.assistant_language,
        selected_model_id: resolvedModelId,
        assistant_model_id: resolvedAssistantModelId,
        admin_model_id: resolvedAdminModelId,
        customer_access_mode: body.customer_access_mode,
        allowed_contacts: body.allowed_contacts,
        allowed_groups: body.allowed_groups,
        auto_reply_enabled: body.auto_reply_enabled,
        business_hours: body.business_hours,
        banned_words: body.banned_words,
        group_moderation_enabled: body.group_moderation_enabled,
      });
    });

    return successResponse({ config: updated }, "Personalisasi bot berhasil diperbarui.");
  } catch (err: any) {
    if (err instanceof ModelAccessError) {
      return errorResponse(set, err.code || "FORBIDDEN", err.message, err.statusCode || 403);
    }
    throw err;
  }
}
