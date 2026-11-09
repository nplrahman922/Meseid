import { describe, expect, it } from "bun:test";
import { AccessGate } from "../../src/modules/chat/pipeline/access-gate";
import type { InboundMessageInput } from "../../src/modules/chat/chat.schema";
import { adminSql } from "../../src/db/client";

describe("Group Auto-Moderation & Supergroup Pipeline Tests", () => {
  const dummyOwnerId = "b51dcb75-e0eb-4c6b-8c8c-f02845aa5f1f";

  it("harus mengenali Telegram Supergroup sebagai chat grup", async () => {
    const randomGroupId = `-100${Date.now()}`;
    const payload: InboundMessageInput = {
      channel: "telegram",
      bot_id: "8655389335",
      external_message_id: "msg_supergroup_001",
      sender_id: "user_12345",
      sender_name: "Member Grup",
      chat_id: randomGroupId,
      chat_type: "supergroup" as any,
      message_type: "text",
      text: "Halo kawan-kawan semua",
      timestamp: Math.floor(Date.now() / 1000),
    };

    const res = await AccessGate.evaluate(payload, dummyOwnerId);
    // Grup baru akan masuk ke auto-discovery (pending approval) alih-alih dianggap personal chat
    expect(res.reason).toBe("new_group_discovered_pending_approval");

    // Bersihkan test data
    await adminSql`
      DELETE FROM channel_access_rules 
      WHERE owner_id = ${dummyOwnerId}::uuid AND target_id = ${randomGroupId}
    `;
  });

  it("harus langsung mencegat pesan SARA di grup aktif tanpa perlu di-mention", async () => {
    const testGroupId = "120363404594602579@g.us";
    
    // Pastikan rule grup aktif
    await adminSql`
      INSERT INTO channel_access_rules (owner_id, channel, target_type, target_id, target_name, status, persona_mode, trigger_mode)
      VALUES (${dummyOwnerId}::uuid, 'whatsapp', 'group', ${testGroupId}, 'Test Grup Aktif', 'active', 'admin', 'mention_or_reply')
      ON CONFLICT (owner_id, channel, target_id) DO UPDATE SET status = 'active'
    `;

    const payload: InboundMessageInput = {
      channel: "whatsapp",
      bot_id: "6281522849183",
      external_message_id: "msg_sara_001",
      sender_id: "62899998888",
      sender_name: "Tukang Rusuh",
      chat_id: testGroupId,
      chat_type: "group",
      message_type: "text",
      text: "Woi dasar penista agama lu semua!",
      timestamp: Math.floor(Date.now() / 1000),
    };

    const res = await AccessGate.evaluate(payload, dummyOwnerId);
    expect(res.isModerationViolation).toBe(true);
    expect(res.moderationWarningReply).toContain("Peringatan untuk @Tukang Rusuh");
    expect(res.moderationWarningReply).toContain("SARA");

    // Bersihkan test rule
    await adminSql`
      DELETE FROM channel_access_rules 
      WHERE owner_id = ${dummyOwnerId}::uuid AND target_id = ${testGroupId}
    `;
  });
});
