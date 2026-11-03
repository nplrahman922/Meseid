import { withSystemContext, withOwnerContext } from "../../../db/client";
import { env } from "../../../config/env";
import { createModuleLogger } from "../../../logs";
import { getOwnerSubscriptionInfo } from "../../owner/personalisasi/model-access.guard";
import type { InboundMessageInput } from "../chat.schema";

const chatLogger = createModuleLogger("chat-owner-resolver");

export interface ChannelOwnerResolution {
  owner_id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  owner_status: string;
  owner_phone?: string | null;
  allowed_contacts?: any;
}

export class OwnerResolver {
  /**
   * Menemukan atau mengikat tenant owner untuk channel connection yang masuk.
   * Dijalankan dalam konteks sistem (meseid_system_ctx).
   */
  static async resolveOrBindOwner(payload: InboundMessageInput): Promise<ChannelOwnerResolution | null> {
    return withSystemContext(async (tx) => {
      const rows = await tx<ChannelOwnerResolution[]>`
        SELECT 
          o.id AS owner_id,
          u.id AS user_id,
          o.business_name,
          o.business_type,
          o.status AS owner_status,
          o.phone AS owner_phone,
          bc.allowed_contacts
        FROM channel_connections cc
        JOIN owners o ON o.id = cc.owner_id
        JOIN users u ON u.id = o.user_id
        LEFT JOIN bot_configs bc ON bc.owner_id = o.id
        WHERE cc.channel = ${payload.channel}
          AND cc.external_account_id = ${payload.bot_id}
          AND cc.status = 'connected'
        LIMIT 1;
      `;

      if (rows.length > 0) {
        return rows[0];
      }

      if (env.DEV_AUTO_BIND_OWNER) {
        chatLogger.info(
          `DEV_AUTO_BIND_OWNER aktif: Mengikat bot_id '${payload.bot_id}' ke owner aktif pertama`,
          { channel: payload.channel, botId: payload.bot_id }
        );

        const defaultOwners = await tx<ChannelOwnerResolution[]>`
          SELECT 
            o.id AS owner_id,
            u.id AS user_id,
            o.business_name,
            o.business_type,
            o.status AS owner_status,
            o.phone AS owner_phone
          FROM owners o
          JOIN users u ON u.id = o.user_id
          WHERE o.status = 'active'
          ORDER BY o.created_at ASC
          LIMIT 1;
        `;

        if (defaultOwners.length > 0) {
          const targetOwner = defaultOwners[0];

          await withOwnerContext(targetOwner.owner_id, targetOwner.user_id, async (ownerTx) => {
            await ownerTx`
              INSERT INTO channel_connections (
                owner_id, channel, external_account_id, status, session_ref
              )
              VALUES (
                ${targetOwner.owner_id},
                ${payload.channel},
                ${payload.bot_id},
                'connected',
                ${`dev_auto_bind_${Date.now()}`}
              )
              ON CONFLICT (channel, external_account_id)
              DO UPDATE SET 
                owner_id = EXCLUDED.owner_id,
                status = 'connected',
                updated_at = now();
            `;
          });

          chatLogger.info(
            `Berhasil auto-bind bot_id '${payload.bot_id}' ke owner '${targetOwner.business_name}' (${targetOwner.owner_id})`
          );

          return targetOwner;
        }
      }

      return null;
    });
  }

  /**
   * Menentukan persona AI murni berbasis data terdaftar di database:
   * 'assistant' untuk owner/internal, 'admin' untuk pelanggan/tamu.
   */
  static determinePersona(
    payload: InboundMessageInput,
    ownerResolution: ChannelOwnerResolution
  ): "assistant" | "admin" {
    if (payload.channel === "whatsapp" && ownerResolution.owner_phone) {
      const cleanSender = payload.sender_id.replace(/[^0-9]/g, "");
      const cleanOwner = ownerResolution.owner_phone.replace(/[^0-9]/g, "");
      const normSender = cleanSender.startsWith("0") ? "62" + cleanSender.slice(1) : cleanSender;
      const normOwner = cleanOwner.startsWith("0") ? "62" + cleanOwner.slice(1) : cleanOwner;
      if (normSender && normOwner && normSender === normOwner) {
        return "assistant";
      }
    }

    if (ownerResolution.allowed_contacts) {
      const contacts = ownerResolution.allowed_contacts;
      if (Array.isArray(contacts)) {
        const isMatched = contacts.some((item: any) => {
          const strItem = String(item).trim();
          if (strItem === payload.sender_id) return true;
          const cleanItem = strItem.replace(/[^0-9]/g, "");
          const cleanSender = payload.sender_id.replace(/[^0-9]/g, "");
          const normItem = cleanItem.startsWith("0") ? "62" + cleanItem.slice(1) : cleanItem;
          const normSender = cleanSender.startsWith("0") ? "62" + cleanSender.slice(1) : cleanSender;
          return Boolean(normItem && normSender && normItem === normSender);
        });
        if (isMatched) {
          return "assistant";
        }
      } else if (typeof contacts === "object" && contacts !== null) {
        const channelList = contacts[payload.channel] || contacts.owner_ids || [];
        if (Array.isArray(channelList) && channelList.includes(payload.sender_id)) {
          return "assistant";
        }
      }
    }

    if (payload.is_from_me || payload.sender_id === payload.bot_id) {
      return "assistant";
    }

    return "admin";
  }

  /**
   * Menyelesaikan model AI yang sah untuk bot owner saat runtime chat.
   */
  static async resolveEffectiveModel(ownerId: string): Promise<string> {
    const DEFAULT_FALLBACK_MODEL = "nvidia/nemotron-3.5-lightning-free";
    try {
      return await withSystemContext(async (tx) => {
        const [botConfig] = await tx<{ selected_model_id: string | null }[]>`
          SELECT selected_model_id
          FROM bot_configs
          WHERE owner_id = ${ownerId}::uuid
          LIMIT 1;
        `;

        const candidateModel = botConfig?.selected_model_id?.trim();
        if (!candidateModel) {
          return DEFAULT_FALLBACK_MODEL;
        }

        const [modelRow] = await tx<{ tier: string; enabled: boolean }[]>`
          SELECT tier, enabled
          FROM ai_models
          WHERE model_id = ${candidateModel}
          LIMIT 1;
        `;

        if (!modelRow || !modelRow.enabled) {
          chatLogger.warn(
            `Model '${candidateModel}' tidak ditemukan atau disabled. Melakukan fallback ke ${DEFAULT_FALLBACK_MODEL}`,
            { ownerId, candidateModel }
          );
          return DEFAULT_FALLBACK_MODEL;
        }

        if (modelRow.tier === "pro") {
          const subInfo = await getOwnerSubscriptionInfo(tx, ownerId);
          if (!subInfo.is_pro) {
            chatLogger.warn(
              `Owner ${ownerId} berada di paket '${subInfo.plan_name}' (non-pro) tetapi bot_configs disetel ke Pro model '${candidateModel}'. Melakukan graceful fallback ke ${DEFAULT_FALLBACK_MODEL}`,
              { ownerId, candidateModel, plan: subInfo.plan_name }
            );
            return DEFAULT_FALLBACK_MODEL;
          }
        }

        return candidateModel;
      });
    } catch (err: any) {
      chatLogger.error(
        `Gagal menyelesaikan effective model: ${err.message}. Fallback ke default ${DEFAULT_FALLBACK_MODEL}`,
        err
      );
      return DEFAULT_FALLBACK_MODEL;
    }
  }
}
