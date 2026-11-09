import { withSystemContext } from "../../../db/client";
import { createModuleLogger } from "../../../logs";
import type { InboundMessageInput } from "../chat.schema";
import { InspectContentAction } from "../moderation/inspect-content.action";

const gateLogger = createModuleLogger("chat-access-gate");

export interface AccessGateResult {
  allowed: boolean;
  reason?: string;
  groupPersona?: "assistant" | "admin";
  effectivePersona?: "assistant" | "admin";
  isModerationViolation?: boolean;
  moderationWarningReply?: string;
}

export class AccessGate {
  /**
   * Memvalidasi apakah pesan diizinkan diproses oleh bot Meseid:
   * 1. Blokir (Blacklist): Nomor / Akun yang diblokir diabaikan seketika.
   * 2. Mode Whitelist: Jika customer_access_mode === 'whitelist', hanya kontak aktif yang diizinkan.
   * 3. Grup Whitelist & Trigger Gate: Grup harus aktif, dan mematuhi aturan pemicu (mention/reply).
   * 4. Auto-Discovery: Mencatat kontak & grup baru ke channel_access_rules.
   */
  static async evaluate(
    payload: InboundMessageInput,
    ownerId: string
  ): Promise<AccessGateResult> {
    const isGroup =
      payload.chat_type === "group" ||
      payload.chat_type === "supergroup" ||
      Boolean(payload.chat_id?.endsWith("@g.us")) ||
      Boolean(payload.chat_id?.startsWith("-"));
    const targetId = isGroup ? payload.chat_id : payload.sender_id;
    const targetType = isGroup ? "group" : "number";
    const targetName = payload.sender_name || payload.sender_id;

    try {
      return await withSystemContext(async (tx) => {
        // Ambil data pemilik toko & konfigurasi bot untuk identifikasi owner multi-kanal
        const [ownerRow] = await tx<{ phone: string | null }[]>`
          SELECT phone FROM owners WHERE id = ${ownerId}::uuid LIMIT 1;
        `;
        const [botConfig] = await tx<{
          customer_access_mode: "open" | "whitelist";
          allowed_contacts?: any;
          banned_words?: any;
          group_moderation_enabled?: boolean;
        }[]>`
          SELECT customer_access_mode, allowed_contacts, banned_words, group_moderation_enabled
          FROM bot_configs
          WHERE owner_id = ${ownerId}::uuid
          LIMIT 1;
        `;
        const cleanSender = targetId.replace(/[^0-9]/g, "");
        const cleanOwner = (ownerRow?.phone || "").replace(/[^0-9]/g, "");
        const normSender = cleanSender.startsWith("0") ? "62" + cleanSender.slice(1) : cleanSender;
        const normOwner = cleanOwner.startsWith("0") ? "62" + cleanOwner.slice(1) : cleanOwner;
        const isOwnerPhone = Boolean(payload.channel === "whatsapp" && normSender && normOwner && normSender === normOwner);

        const allowedContacts: string[] = Array.isArray(botConfig?.allowed_contacts)
          ? botConfig.allowed_contacts.map(String)
          : [];

        const isAllowedContact = allowedContacts.some((c) => {
          if (c === targetId) return true;
          const cleanC = c.replace(/[^0-9]/g, "");
          const normC = cleanC.startsWith("0") ? "62" + cleanC.slice(1) : cleanC;
          return Boolean(normC && normSender && normC === normSender);
        });

        const isOwner = Boolean(!isGroup && (isOwnerPhone || isAllowedContact));

        // 1. Ambil aturan akses spesifik untuk target ini
        const [existingRule] = await tx<
          {
            id: string;
            status: "active" | "disabled" | "blocked";
            persona_mode: "assistant" | "admin";
            trigger_mode: "mention_or_reply" | "always";
          }[]
        >`
          SELECT id, status, persona_mode, trigger_mode
          FROM channel_access_rules
          WHERE owner_id = ${ownerId}::uuid
            AND channel = ${payload.channel}
            AND target_id = ${targetId}
          LIMIT 1;
        `;

        // A. Cek Blacklist (Nomor / Akun Diblokir, kontak owner selalu kebal proteksi)
        if (existingRule && existingRule.status === "blocked" && !isOwner) {
          gateLogger.info(
            `Pesan dari ${targetType} '${targetId}' diabaikan karena status DIBLOKIR`,
            { channel: payload.channel, targetId }
          );
          return { allowed: false, reason: "blocked_contact" };
        }

        // B. Cek Konfigurasi Mode Global Owner ('open' vs 'whitelist')
        const globalMode = botConfig?.customer_access_mode || "open";

        // C. Penanganan Khusus Pesan Grup
        if (isGroup) {
          if (!existingRule) {
            // Auto-discovery grup baru: simpan dengan status 'disabled' (menunggu persetujuan owner di dashboard)
            await tx`
              INSERT INTO channel_access_rules (
                owner_id, channel, target_type, target_id, target_name, custom_label, status, persona_mode, trigger_mode, last_interaction_at
              )
              VALUES (
                ${ownerId}::uuid, ${payload.channel}, 'group', ${targetId}, ${targetName}, 'Grup Usaha/Komunitas', 'disabled', 'admin', 'mention_or_reply', now()
              )
              ON CONFLICT (owner_id, channel, target_id) DO UPDATE
              SET last_interaction_at = now();
            `;

            gateLogger.info(`Grup baru terdeteksi: '${targetName}' (${targetId}) - Menunggu aktivasi owner`);
            return { allowed: false, reason: "new_group_discovered_pending_approval" };
          }

          if (existingRule.status !== "active") {
            return { allowed: false, reason: "inactive_group" };
          }

          // C.1 Moderasi Otomatis Konten Grup (SARA, Kasar, Spam, Kata Terlarang Owner)
          if (botConfig?.group_moderation_enabled !== false && payload.text) {
            const customBannedWords: string[] = Array.isArray(botConfig?.banned_words)
              ? botConfig.banned_words.map(String)
              : [];

            const moderation = InspectContentAction.execute({
              text: payload.text,
              senderName: payload.sender_name || targetName,
              isGroup: true,
              customBannedWords,
              moderationEnabled: true,
            });

            if (moderation.isViolation && moderation.warningReply) {
              gateLogger.info(
                `Pelanggaran moderasi grup terdeteksi [${moderation.category}]: '${moderation.matchedWord}' oleh '${targetName}' di '${targetId}'`,
                { channel: payload.channel, targetId, category: moderation.category }
              );

              return {
                allowed: true,
                isModerationViolation: true,
                moderationWarningReply: moderation.warningReply,
                groupPersona: existingRule.persona_mode || "admin",
                effectivePersona: existingRule.persona_mode || "admin",
              };
            }
          }

          // Cek Trigger Mode (Mention atau Reply)
          if (existingRule.trigger_mode === "mention_or_reply") {
            const isQuoted = Boolean(payload.quoted_text);
            const cleanBotId = payload.bot_id.replace(/[^0-9]/g, "");
            const textLower = (payload.text || "").toLowerCase();
            const hasMention =
              textLower.includes(`@${cleanBotId}`) ||
              textLower.includes("@bot") ||
              textLower.includes(`@${payload.bot_id}`);

            if (!isQuoted && !hasMention) {
              return { allowed: false, reason: "group_message_not_mention_or_reply" };
            }
          }

          const persona = existingRule.persona_mode || "admin";
          return {
            allowed: true,
            groupPersona: persona,
            effectivePersona: persona,
          };
        }

        // D. Penanganan Kontak Personal (Mode Whitelist vs Open)
        const defaultPersona = isOwner ? "assistant" : "admin";
        const defaultLabel = isOwner ? "Owner / Pemilik" : "Pelanggan";

        if (globalMode === "whitelist") {
          if (!existingRule || existingRule.status !== "active") {
            // Auto-record kontak jika belum ada
            if (!existingRule) {
              await tx`
                INSERT INTO channel_access_rules (
                  owner_id, channel, target_type, target_id, target_name, custom_label, status, persona_mode, last_interaction_at
                )
                VALUES (
                  ${ownerId}::uuid, ${payload.channel}, 'number', ${targetId}, ${targetName}, ${defaultLabel}, 'disabled', ${defaultPersona}, now()
                )
                ON CONFLICT (owner_id, channel, target_id) DO NOTHING;
              `;
            }
            return { allowed: false, reason: "whitelist_only" };
          }
        } else {
          // Mode 'open': Jika belum terdaftar, otomatis catat sebagai active
          if (!existingRule) {
            await tx`
              INSERT INTO channel_access_rules (
                owner_id, channel, target_type, target_id, target_name, custom_label, status, persona_mode, last_interaction_at
              )
              VALUES (
                ${ownerId}::uuid, ${payload.channel}, 'number', ${targetId}, ${targetName}, ${defaultLabel}, 'active', ${defaultPersona}, now()
              )
              ON CONFLICT (owner_id, channel, target_id) DO UPDATE
              SET last_interaction_at = now();
            `;
          } else {
            await tx`
              UPDATE channel_access_rules
              SET last_interaction_at = now()
              WHERE id = ${existingRule.id}::uuid;
            `;
          }
        }

        // D.1 Moderasi Pesan Personal Pelanggan (Non-Owner)
        if (!isOwner && payload.text) {
          const customBannedWords: string[] = Array.isArray(botConfig?.banned_words)
            ? botConfig.banned_words.map(String)
            : [];

          const personalModeration = InspectContentAction.execute({
            text: payload.text,
            senderName: payload.sender_name || targetName,
            isGroup: false,
            customBannedWords,
            moderationEnabled: true,
          });

          if (personalModeration.isViolation && personalModeration.warningReply) {
            return {
              allowed: true,
              isModerationViolation: true,
              moderationWarningReply: personalModeration.warningReply,
              effectivePersona: defaultPersona,
            };
          }
        }

        return {
          allowed: true,
          effectivePersona: existingRule?.persona_mode || defaultPersona,
        };
      });
    } catch (err: any) {
      gateLogger.error("Gagal mengevaluasi access gate, fallback ke izin akses terbuka", err, {
        channel: payload.channel,
        targetId,
        ownerId,
      });
      return { allowed: true, groupPersona: "admin", effectivePersona: "admin" };
    }
  }
}
