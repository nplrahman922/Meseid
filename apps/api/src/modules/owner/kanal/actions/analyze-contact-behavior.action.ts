import { Tx } from "../../../../db/client";
import { executeChatCompletion } from "../../../../adapters/ai/client/gateway-client";
import { PromptEngine } from "../../../../adapters/ai/prompts/prompt-engine";
import { AiCotCleaner } from "../../../../adapters/ai/sanitizer/ai-cot-cleaner";
import { getOwnerSubscriptionTierAction } from "../../personalisasi/presets/actions/get-owner-subscription-tier.action";
import { AnalyzeBehaviorInput } from "../kanal-access.types";

/**
 * Menganalisis profil perilaku nomor/grup berdasarkan riwayat percakapan.
 * Menggunakan Nemotron 3.5 Free (1500 tokens) dengan sanitasi Chain-of-Thought (CoT).
 */
export async function analyzeContactBehaviorAction(
  tx: Tx,
  ownerId: string,
  input: AnalyzeBehaviorInput
): Promise<{
  target_id: string;
  behavior_summary: string;
  behavior_analyzed_at: string;
  model_used: string;
}> {
  const cleanTargetId = input.target_id.trim();
  const isGroupTarget = input.target_type === "group" || cleanTargetId.endsWith("@g.us");

  // 1. Validasi tier langganan: jika akun free, kunci ke Nemotron Free
  const sub = await getOwnerSubscriptionTierAction(tx, ownerId);
  const NEMOTRON_FREE = "nvidia/nemotron-3.5-lightning-free";
  const modelToUse = sub.is_pro && input.model_id ? input.model_id : NEMOTRON_FREE;

  // 2. Cek apakah target merupakan nomor pemilik toko terdaftar
  const [ownerRow] = await tx<{ phone: string | null }[]>`
    SELECT phone FROM owners WHERE id = ${ownerId}::uuid LIMIT 1;
  `;
  const cleanSender = cleanTargetId.replace(/[^0-9]/g, "");
  const cleanOwner = (ownerRow?.phone || "").replace(/[^0-9]/g, "");
  const normSender = cleanSender.startsWith("0") ? "62" + cleanSender.slice(1) : cleanSender;
  const normOwner = cleanOwner.startsWith("0") ? "62" + cleanOwner.slice(1) : cleanOwner;
  const isOwner = Boolean(!isGroupTarget && normOwner && normSender && normOwner === normSender);

  let categoryLabel = isGroupTarget ? "Grup Usaha" : "Pelanggan";
  let shortNote = "Kontak aktif berinteraksi dengan bot toko.";
  const nowIso = new Date().toISOString();

  if (isOwner) {
    categoryLabel = "Owner / Pemilik";
    shortNote = "Pemilik toko terdaftar (Akses Asisten Bisnis & Keuangan).";
  } else {
    // 3. Ambil riwayat percakapan terakhir dari conversation_messages
    const recentMessages = await tx<
      { role: string; content: string; created_at: Date }[]
    >`
      SELECT role, content, created_at
      FROM conversation_messages
      WHERE owner_id = ${ownerId}::uuid
        AND sender_id = ${cleanTargetId}
      ORDER BY created_at DESC
      LIMIT 20;
    `;

    if (!recentMessages || recentMessages.length === 0) {
      shortNote = "Belum ada riwayat percakapan yang cukup untuk dianalisis.";
    } else {
      const chronological = [...recentMessages].reverse();
      const transcriptText = chronological
        .map((m) => `${m.role === "user" ? "Pengguna" : "Bot"}: ${m.content.trim()}`)
        .join("\n");

      const systemPrompt = PromptEngine.loadTemplate("contact-profiler.system.md");

      try {
        const result = await executeChatCompletion({
          model: modelToUse,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Tipe Target: ${isGroupTarget ? "Grup" : "Nomor Personal"}\nRiwayat obrolan:\n${transcriptText}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        });

        const raw = result.content || (result as any).text || "";
        const cleaned = AiCotCleaner.cleanThinkingArtifacts(raw);
        const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.category_label) categoryLabel = String(parsed.category_label).trim();
            if (parsed.short_note) shortNote = String(parsed.short_note).trim();
          } catch {
            shortNote = cleaned.slice(0, 150).trim() || shortNote;
          }
        } else {
          shortNote = cleaned.slice(0, 150).trim() || shortNote;
        }
      } catch {
        shortNote = "Kontak berinteraksi normal dengan bot toko.";
      }
    }
  }

  // 4. Simpan label kategori dan ringkasan perilaku ke database channel_access_rules
  await tx`
    UPDATE channel_access_rules
    SET custom_label = ${categoryLabel},
        behavior_summary = ${shortNote},
        behavior_analyzed_at = ${nowIso}::timestamptz,
        updated_at = now()
    WHERE owner_id = ${ownerId}::uuid
      AND channel = ${input.channel}
      AND target_id = ${cleanTargetId};
  `;

  return {
    target_id: cleanTargetId,
    behavior_summary: shortNote,
    behavior_analyzed_at: nowIso,
    model_used: modelToUse,
  };
}
