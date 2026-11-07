import { Tx } from "../../../../db/client";
import { ChannelAccessRule, UpsertAccessRuleInput } from "../kanal-access.types";

/**
 * Menyimpan atau memperbarui aturan akses untuk satu kontak atau grup (Status, Peran, Label).
 */
export async function upsertAccessRuleAction(
  tx: Tx,
  ownerId: string,
  input: UpsertAccessRuleInput
): Promise<ChannelAccessRule> {
  const cleanTargetId = input.target_id.trim();
  const targetName = input.target_name?.trim() || cleanTargetId;
  const status = input.status || "active";
  const targetPersona = input.persona_mode || "admin";
  const triggerMode = input.trigger_mode || "mention_or_reply";

  // Validasi Proteksi: Dilarang memblokir kontak owner utama (WhatsApp & Telegram)
  const [ownerRow] = await tx<{ phone: string | null }[]>`
    SELECT phone FROM owners WHERE id = ${ownerId}::uuid LIMIT 1;
  `;
  const [botConfig] = await tx<{ allowed_contacts?: any }[]>`
    SELECT allowed_contacts FROM bot_configs WHERE owner_id = ${ownerId}::uuid LIMIT 1;
  `;
  const cleanSender = cleanTargetId.replace(/[^0-9]/g, "");
  const cleanOwner = (ownerRow?.phone || "").replace(/[^0-9]/g, "");
  const normSender = cleanSender.startsWith("0") ? "62" + cleanSender.slice(1) : cleanSender;
  const normOwner = cleanOwner.startsWith("0") ? "62" + cleanOwner.slice(1) : cleanOwner;

  const allowedContacts: string[] = Array.isArray(botConfig?.allowed_contacts)
    ? botConfig.allowed_contacts.map(String)
    : [];

  const isOwnerPhone = Boolean(
    input.channel === "whatsapp" &&
    normOwner &&
    normSender &&
    normOwner === normSender
  );

  const isAllowedContact = allowedContacts.some((c) => {
    if (c === cleanTargetId) return true;
    const cleanC = c.replace(/[^0-9]/g, "");
    const normC = cleanC.startsWith("0") ? "62" + cleanC.slice(1) : cleanC;
    return Boolean(normC && normSender && normC === normSender);
  });

  const isOwner = Boolean(
    input.target_type === "number" && (isOwnerPhone || isAllowedContact)
  );

  if (isOwner && status === "blocked") {
    throw new Error("Kontak utama pemilik toko dilindungi dan tidak dapat diblokir.");
  }

  // Jika target adalah owner terverifikasi, kunci persona paten sebagai 'assistant'
  const personaMode = isOwner ? "assistant" : targetPersona;

  const [row] = await tx<ChannelAccessRule[]>`
    INSERT INTO channel_access_rules (
      owner_id, channel, target_type, target_id, target_name,
      custom_label, status, persona_mode, trigger_mode, updated_at
    )
    VALUES (
      ${ownerId}::uuid,
      ${input.channel},
      ${input.target_type},
      ${cleanTargetId},
      ${targetName},
      ${input.custom_label?.trim() || null},
      ${status},
      ${personaMode},
      ${triggerMode},
      now()
    )
    ON CONFLICT (owner_id, channel, target_id) DO UPDATE
    SET target_name = COALESCE(NULLIF(EXCLUDED.target_name, ''), channel_access_rules.target_name),
        custom_label = COALESCE(EXCLUDED.custom_label, channel_access_rules.custom_label),
        status = EXCLUDED.status,
        persona_mode = EXCLUDED.persona_mode,
        trigger_mode = EXCLUDED.trigger_mode,
        updated_at = now()
    RETURNING id, owner_id, channel, target_type, target_id, target_name,
              custom_label, status, persona_mode, trigger_mode,
              behavior_summary, behavior_analyzed_at, last_interaction_at,
              created_at, updated_at;
  `;

  return {
    ...row,
    is_owner: isOwner,
  };
}
