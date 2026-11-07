import { withSystemContext } from "../../../db/client";
import { createModuleLogger } from "../../../logs";
import { getOwnerSubscriptionTierAction } from "../../owner/personalisasi/presets/actions/get-owner-subscription-tier.action";
import type { AiModelPresetRecord } from "../../owner/personalisasi/presets/preset.types";

const resolverLogger = createModuleLogger("preset-resolver");

export const DEFAULT_FREE_PRESET_CODE = "nemotron-free";

export class PresetResolver {
  /**
   * Menyelesaikan konfigurasi preset model AI dan racikan parameter runtime secara riil dari database.
   * Mendukung resolusi model terpisah antara Asisten Pemilik dan Admin Toko.
   * Melakukan graceful fallback jika preset tidak ditemukan atau akun Pro telah kedaluwarsa.
   */
  static async resolveRuntimePreset(
    ownerId: string,
    persona: "assistant" | "admin" = "admin"
  ): Promise<AiModelPresetRecord> {
    return await withSystemContext(async (tx) => {
      // 1. Ambil pilihan model yang disimpan owner
      const [botConfig] = await tx<{
        selected_model_id: string | null;
        assistant_model_id: string | null;
        admin_model_id: string | null;
      }[]>`
        SELECT selected_model_id, assistant_model_id, admin_model_id
        FROM bot_configs
        WHERE owner_id = ${ownerId}::uuid
        LIMIT 1;
      `;

      let candidate = DEFAULT_FREE_PRESET_CODE;
      if (persona === "assistant") {
        candidate =
          botConfig?.assistant_model_id?.trim() ||
          botConfig?.selected_model_id?.trim() ||
          DEFAULT_FREE_PRESET_CODE;
      } else {
        candidate =
          botConfig?.admin_model_id?.trim() ||
          DEFAULT_FREE_PRESET_CODE;
      }

      // 2. Query preset aktif dari database ai_model_presets
      let [presetRow] = await tx<any[]>`
        SELECT id, preset_code, display_name, badge, description, tier_required,
               model_id, fallback_model_id, temperature, max_tokens, confidence_threshold,
               system_prompt_style, strip_thinking_tags, supports_vision, supports_audio,
               supports_web_search, supports_reasoning, score, extra_params, is_active, priority_order
        FROM ai_model_presets
        WHERE (preset_code = ${candidate} OR model_id = ${candidate})
          AND is_active = true
        LIMIT 1;
      `;

      // Jika candidate tidak ditemukan, ambil default free
      if (!presetRow) {
        resolverLogger.warn(`Preset / Model '${candidate}' tidak ditemukan di ai_model_presets. Menggunakan default ${DEFAULT_FREE_PRESET_CODE}`, {
          ownerId,
          candidate,
        });

        [presetRow] = await tx<any[]>`
          SELECT id, preset_code, display_name, badge, description, tier_required,
                 model_id, fallback_model_id, temperature, max_tokens, confidence_threshold,
                 system_prompt_style, strip_thinking_tags, supports_vision, supports_audio,
                 supports_web_search, supports_reasoning, score, extra_params, is_active, priority_order
          FROM ai_model_presets
          WHERE preset_code = ${DEFAULT_FREE_PRESET_CODE}
          LIMIT 1;
        `;
      }

      const preset: AiModelPresetRecord = {
        ...presetRow,
        temperature: Number(presetRow.temperature),
        confidence_threshold: Number(presetRow.confidence_threshold),
        score: Number(presetRow.score),
        extra_params: typeof presetRow.extra_params === "object" && presetRow.extra_params !== null ? presetRow.extra_params : {},
      };

      // 3. Validasi hak akses tier Pro
      if (preset.tier_required === "pro") {
        const subInfo = await getOwnerSubscriptionTierAction(tx, ownerId);
        if (!subInfo.is_pro) {
          resolverLogger.warn(
            `Owner ${ownerId} berada di paket '${subInfo.plan_name}' (bukan Pro aktif) tetapi mencoba memakai Pro preset '${preset.preset_code}'. Melakukan graceful fallback ke ${DEFAULT_FREE_PRESET_CODE}`,
            { ownerId, candidate, plan: subInfo.plan_name }
          );

          const [freeRow] = await tx<any[]>`
            SELECT id, preset_code, display_name, badge, description, tier_required,
                   model_id, fallback_model_id, temperature, max_tokens, confidence_threshold,
                   system_prompt_style, strip_thinking_tags, supports_vision, supports_audio,
                   supports_web_search, supports_reasoning, score, extra_params, is_active, priority_order
            FROM ai_model_presets
            WHERE preset_code = ${DEFAULT_FREE_PRESET_CODE}
            LIMIT 1;
          `;

          if (freeRow) {
            return {
              ...freeRow,
              temperature: Number(freeRow.temperature),
              confidence_threshold: Number(freeRow.confidence_threshold),
              score: Number(freeRow.score),
              extra_params: typeof freeRow.extra_params === "object" && freeRow.extra_params !== null ? freeRow.extra_params : {},
            };
          }
        }
      }

      return preset;
    });
  }
}
