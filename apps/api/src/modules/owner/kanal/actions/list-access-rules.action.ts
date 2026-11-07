import { Tx } from "../../../../db/client";
import { ChannelAccessRule, ListAccessRulesFilter } from "../kanal-access.types";

/**
 * Mengambil daftar aturan akses kontak & grup beserta mode akses global untuk owner tertentu.
 */
export async function listAccessRulesAction(
  tx: Tx,
  ownerId: string,
  filter?: ListAccessRulesFilter
): Promise<{
  global_access_mode: "open" | "whitelist";
  rules: ChannelAccessRule[];
  summary: {
    total: number;
    groups_count: number;
    numbers_count: number;
    blocked_count: number;
  };
}> {
  const [botConfig] = await tx<{ customer_access_mode: "open" | "whitelist"; allowed_contacts?: any }[]>`
    SELECT customer_access_mode, allowed_contacts
    FROM bot_configs
    WHERE owner_id = ${ownerId}::uuid
    LIMIT 1;
  `;

  const globalAccess = botConfig?.customer_access_mode || "open";

  const [ownerRow] = await tx<{ phone: string | null }[]>`
    SELECT phone FROM owners WHERE id = ${ownerId}::uuid LIMIT 1;
  `;
  const cleanOwner = (ownerRow?.phone || "").replace(/[^0-9]/g, "");
  const normOwner = cleanOwner.startsWith("0") ? "62" + cleanOwner.slice(1) : cleanOwner;

  const allowedContacts: string[] = Array.isArray(botConfig?.allowed_contacts)
    ? botConfig.allowed_contacts.map(String)
    : [];

  const allRows = await tx<ChannelAccessRule[]>`
    SELECT id, owner_id, channel, target_type, target_id, target_name,
           custom_label, status, persona_mode, trigger_mode,
           behavior_summary, behavior_analyzed_at, last_interaction_at,
           created_at, updated_at
    FROM channel_access_rules
    WHERE owner_id = ${ownerId}::uuid
    ORDER BY updated_at DESC;
  `;

  const enrichedRows: ChannelAccessRule[] = allRows.map((r) => {
    const cleanTarget = r.target_id.replace(/[^0-9]/g, "");
    const normTarget = cleanTarget.startsWith("0") ? "62" + cleanTarget.slice(1) : cleanTarget;

    const isOwnerPhone = Boolean(
      r.channel === "whatsapp" &&
      normOwner &&
      normTarget &&
      normOwner === normTarget
    );

    const isAllowedContact = allowedContacts.some((c) => {
      if (c === r.target_id) return true;
      const cleanC = c.replace(/[^0-9]/g, "");
      const normC = cleanC.startsWith("0") ? "62" + cleanC.slice(1) : cleanC;
      return Boolean(normC && normTarget && normC === normTarget);
    });

    const isOwner = Boolean(
      r.target_type === "number" && (isOwnerPhone || isAllowedContact)
    );

    return {
      ...r,
      is_owner: isOwner,
    };
  });

  let filtered = enrichedRows;

  if (filter?.channel) {
    filtered = filtered.filter((r) => r.channel === filter.channel);
  }

  if (filter?.target_type) {
    filtered = filtered.filter((r) => r.target_type === filter.target_type);
  }

  if (filter?.status) {
    filtered = filtered.filter((r) => r.status === filter.status);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.target_name?.toLowerCase().includes(q) ||
        r.custom_label?.toLowerCase().includes(q) ||
        r.target_id?.toLowerCase().includes(q)
    );
  }

  return {
    global_access_mode: globalAccess,
    rules: filtered,
    summary: {
      total: allRows.length,
      groups_count: allRows.filter((r) => r.target_type === "group").length,
      numbers_count: allRows.filter((r) => r.target_type === "number").length,
      blocked_count: allRows.filter((r) => r.status === "blocked").length,
    },
  };
}
