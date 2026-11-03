import { Tx } from "../../../../db/client";
import { successResponse, errorResponse } from "../../../../logs";
import { compilePersonaPrompt } from "../compiler/persona-compiler";
import { updatePersonalisasi } from "../actions/update-personalisasi.action";
import { validateModelAccessForOwner, ModelAccessError } from "../model-access.guard";

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
    selected_model_id?: string | null;
    customer_access_mode?: "open" | "whitelist";
    allowed_contacts?: any;
    allowed_groups?: any;
    auto_reply_enabled?: boolean;
    business_hours?: any;
  };
  owner: { id: string; businessName: string; businessType: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
  set: { status?: number | string };
}) {
  let adminPrompt = body.admin_persona_prompt;
  let assistantPrompt = body.assistant_persona_prompt;

  if (
    (!adminPrompt || !assistantPrompt) &&
    (body.speaking_styles || body.custom_rules)
  ) {
    const compiled = compilePersonaPrompt({
      businessName: owner.businessName,
      businessType: owner.businessType,
      speakingStyles: body.speaking_styles,
      customRules: body.custom_rules,
    });
    if (!adminPrompt) adminPrompt = compiled.adminPersonaPrompt;
    if (!assistantPrompt) assistantPrompt = compiled.assistantPersonaPrompt;
  }

  try {
    const updated = await runOwnerTx(async (tx) => {
      if (body.selected_model_id !== undefined && body.selected_model_id !== null) {
        await validateModelAccessForOwner(tx, owner.id, body.selected_model_id);
      }

      return await updatePersonalisasi(tx, owner.id, {
        admin_bot_name: body.admin_bot_name,
        assistant_bot_name: body.assistant_bot_name,
        admin_persona_prompt: adminPrompt,
        assistant_persona_prompt: assistantPrompt,
        selected_model_id: body.selected_model_id,
        customer_access_mode: body.customer_access_mode,
        allowed_contacts: body.allowed_contacts,
        allowed_groups: body.allowed_groups,
        auto_reply_enabled: body.auto_reply_enabled,
        business_hours: body.business_hours,
      });
    });

    return successResponse({ config: updated }, "Personalisasi bot berhasil diperbarui.");
  } catch (err: any) {
    if (err instanceof ModelAccessError) {
      set.status = 403;
      return errorResponse("FORBIDDEN", err.message);
    }
    throw err;
  }
}
