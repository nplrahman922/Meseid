import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { listAccessRulesAction } from "../../src/modules/owner/kanal/actions/list-access-rules.action";
import { upsertAccessRuleAction } from "../../src/modules/owner/kanal/actions/upsert-access-rule.action";
import { AccessGate } from "../../src/modules/chat/pipeline/access-gate";

describe("Unit & Integrity Tests: Multi-Channel Owner Protection (WhatsApp & Telegram)", () => {
  const testOwnerId = "b51dcb75-e0eb-4c6b-8c8c-f02845aa5f1f";
  const testOwnerPhone = "+6281385266775";
  const testTgOwnerChatId = "5975067348";
  const testCustomerPhone = "6282150240263";
  const testCustomerTg = "1122334455";

  it("TEST 1: listAccessRulesAction menandai is_owner = true untuk nomor WhatsApp dan Chat ID Telegram terverifikasi", async () => {
    const mockTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join(" ");
      if (sql.includes("FROM bot_configs")) {
        return [
          {
            customer_access_mode: "open",
            allowed_contacts: [testTgOwnerChatId, "6281385266775"],
          },
        ];
      }
      if (sql.includes("FROM owners")) {
        return [{ phone: testOwnerPhone }];
      }
      if (sql.includes("FROM channel_access_rules")) {
        return [
          {
            id: "rule-1",
            owner_id: testOwnerId,
            channel: "whatsapp",
            target_type: "number",
            target_id: "6281385266775",
            target_name: "Owner WA",
            custom_label: "Owner / Pemilik",
            status: "active",
            persona_mode: "assistant",
            trigger_mode: "always",
            behavior_summary: null,
            behavior_analyzed_at: null,
            last_interaction_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "rule-2",
            owner_id: testOwnerId,
            channel: "telegram",
            target_type: "number",
            target_id: testTgOwnerChatId,
            target_name: testTgOwnerChatId,
            custom_label: "Owner / Pemilik",
            status: "active",
            persona_mode: "assistant",
            trigger_mode: "always",
            behavior_summary: null,
            behavior_analyzed_at: null,
            last_interaction_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "rule-3",
            owner_id: testOwnerId,
            channel: "whatsapp",
            target_type: "number",
            target_id: testCustomerPhone,
            target_name: "Customer B",
            custom_label: "Pelanggan",
            status: "active",
            persona_mode: "admin",
            trigger_mode: "mention_or_reply",
            behavior_summary: null,
            behavior_analyzed_at: null,
            last_interaction_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "rule-4",
            owner_id: testOwnerId,
            channel: "telegram",
            target_type: "number",
            target_id: testCustomerTg,
            target_name: "Guest TG",
            custom_label: "Pelanggan",
            status: "active",
            persona_mode: "admin",
            trigger_mode: "mention_or_reply",
            behavior_summary: null,
            behavior_analyzed_at: null,
            last_interaction_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];
      }
      return [];
    };

    const res = await listAccessRulesAction(mockTx, testOwnerId);
    expect(res.rules.length).toBe(4);

    const waOwner = res.rules.find((r) => r.channel === "whatsapp" && r.target_id === "6281385266775");
    expect(waOwner?.is_owner).toBe(true);

    const tgOwner = res.rules.find((r) => r.channel === "telegram" && r.target_id === testTgOwnerChatId);
    expect(tgOwner?.is_owner).toBe(true);

    const waCustomer = res.rules.find((r) => r.channel === "whatsapp" && r.target_id === testCustomerPhone);
    expect(waCustomer?.is_owner).toBe(false);

    const tgGuest = res.rules.find((r) => r.channel === "telegram" && r.target_id === testCustomerTg);
    expect(tgGuest?.is_owner).toBe(false);
  });

  it("TEST 2: upsertAccessRuleAction menolak mutlak pemblokiran pada akun WhatsApp maupun Telegram milik owner", async () => {
    const mockTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join(" ");
      if (sql.includes("FROM owners")) {
        return [{ phone: testOwnerPhone }];
      }
      if (sql.includes("FROM bot_configs")) {
        return [
          {
            allowed_contacts: [testTgOwnerChatId, "6281385266775"],
          },
        ];
      }
      if (sql.includes("INSERT INTO channel_access_rules")) {
        return [
          {
            id: "rule-upsert",
            owner_id: testOwnerId,
            channel: "telegram",
            target_type: "number",
            target_id: testTgOwnerChatId,
            target_name: testTgOwnerChatId,
            custom_label: "Owner / Pemilik",
            status: "active",
            persona_mode: "assistant",
            trigger_mode: "always",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];
      }
      return [];
    };

    // Upaya 1: Blokir WhatsApp Owner -> Harus ditolak
    await expect(
      upsertAccessRuleAction(mockTx, testOwnerId, {
        channel: "whatsapp",
        target_type: "number",
        target_id: "6281385266775",
        status: "blocked",
      })
    ).rejects.toThrow("Kontak utama pemilik toko dilindungi dan tidak dapat diblokir.");

    // Upaya 2: Blokir Telegram Owner -> Harus ditolak
    await expect(
      upsertAccessRuleAction(mockTx, testOwnerId, {
        channel: "telegram",
        target_type: "number",
        target_id: testTgOwnerChatId,
        status: "blocked",
      })
    ).rejects.toThrow("Kontak utama pemilik toko dilindungi dan tidak dapat diblokir.");

    // Upaya 3: Update normal (active) pada Telegram Owner -> Sukses dan is_owner: true
    const result = await upsertAccessRuleAction(mockTx, testOwnerId, {
      channel: "telegram",
      target_type: "number",
      target_id: testTgOwnerChatId,
      status: "active",
      persona_mode: "assistant",
    });
    expect(result.is_owner).toBe(true);
  });

  it("TEST 3: upsertAccessRuleAction memastikan persona owner selalu terkunci sebagai 'assistant'", async () => {
    let insertedPersona = "";
    const mockTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join(" ");
      if (sql.includes("FROM owners")) {
        return [{ phone: testOwnerPhone }];
      }
      if (sql.includes("FROM bot_configs")) {
        return [
          {
            allowed_contacts: [testTgOwnerChatId, "6281385266775"],
          },
        ];
      }
      if (sql.includes("INSERT INTO channel_access_rules")) {
        // Ambil nilai personaMode dari values
        insertedPersona = values[7]; // personaMode value
        return [
          {
            id: "rule-upsert",
            owner_id: testOwnerId,
            channel: "telegram",
            target_type: "number",
            target_id: testTgOwnerChatId,
            target_name: testTgOwnerChatId,
            custom_label: "Owner / Pemilik",
            status: "active",
            persona_mode: insertedPersona,
            trigger_mode: "always",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];
      }
      return [];
    };

    // Mencoba kirim persona_mode: 'admin' untuk Telegram Owner
    const result = await upsertAccessRuleAction(mockTx, testOwnerId, {
      channel: "telegram",
      target_type: "number",
      target_id: testTgOwnerChatId,
      status: "active",
      persona_mode: "admin",
    });

    expect(result.is_owner).toBe(true);
    expect(insertedPersona).toBe("assistant");
  });

  it("TEST 4: Verifikasi Kepatuhan AGENTS.md: Batas Ukuran Baris (< 400 baris) pada seluruh berkas", () => {
    const filesToCheck = [
      "../../src/modules/owner/kanal/actions/list-access-rules.action.ts",
      "../../src/modules/owner/kanal/actions/upsert-access-rule.action.ts",
      "../../src/modules/chat/pipeline/access-gate.ts",
      "../../../web/src/panels/users/kanal/components/AccessRulesTableRow.svelte",
    ];

    for (const relPath of filesToCheck) {
      const fullPath = resolve(__dirname, relPath);
      if (!existsSync(fullPath)) continue; // Abaikan berkas web jika berjalan di dalam kontainer api
      const content = readFileSync(fullPath, "utf-8");
      const lineCount = content.split("\n").length;
      expect(lineCount).toBeLessThan(400);
    }
  });
});
