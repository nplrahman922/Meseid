import { Tx } from "../../../../db/client";
import { successResponse } from "../../../../logs";
import { listActivePresetsAction } from "../presets/actions/list-active-presets.action";
import { getOwnerSubscriptionTierAction } from "../presets/actions/get-owner-subscription-tier.action";
import type { OwnerAccessiblePresetCard } from "../presets/preset.types";

/**
 * Controller untuk GET /api/owner/personalisasi/models
 * Mengambil katalog 4 model AI teruji dari database ai_model_presets beserta status aksesibilitasnya.
 */
export async function getAvailableBotModelsController({
  owner,
  runOwnerTx,
}: {
  owner: { id: string };
  runOwnerTx: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}) {
  const result = await runOwnerTx(async (tx) => {
    const subscription = await getOwnerSubscriptionTierAction(tx, owner.id);
    const presets = await listActivePresetsAction(tx);

    const [botConfig] = await tx<{
      selected_model_id: string | null;
      assistant_model_id: string | null;
      admin_model_id: string | null;
    }[]>`
      SELECT selected_model_id, assistant_model_id, admin_model_id
      FROM bot_configs
      WHERE owner_id = ${owner.id}::uuid
      LIMIT 1;
    `;

    const assistantSelection = botConfig?.assistant_model_id || botConfig?.selected_model_id || "nemotron-free";
    const adminSelection = botConfig?.admin_model_id || "nemotron-free";
    const currentSelection = assistantSelection;

    const models: OwnerAccessiblePresetCard[] = presets.map((p) => {
      const isAccessible = subscription.is_pro ? true : p.tier_required === "free";
      const isCurrent = p.preset_code === currentSelection || p.model_id === currentSelection;

      return {
        id: p.id,
        preset_code: p.preset_code,
        model_id: p.model_id,
        name: p.display_name,
        display_name: p.display_name,
        badge: p.badge,
        description: p.description,
        tier: p.tier_required,
        jenis: p.tier_required === "free" ? "Gratis" : "Berbayar",
        tipe: p.supports_vision ? "VLM" : "LLM",
        score: p.score,
        supports_vision: p.supports_vision,
        supports_audio: p.supports_audio,
        supports_web_search: p.supports_web_search,
        supports_reasoning: p.supports_reasoning,
        is_accessible: isAccessible,
        is_current: isCurrent,
      };
    });

    return {
      subscription,
      current_model_id: currentSelection,
      current_assistant_model_id: assistantSelection,
      current_admin_model_id: adminSelection,
      models,
      data: {
        subscription,
        current_model_id: currentSelection,
        current_assistant_model_id: assistantSelection,
        current_admin_model_id: adminSelection,
        models,
      },
    };
  });

  return successResponse(result, "Daftar model AI bot teruji berhasil diambil.");
}
