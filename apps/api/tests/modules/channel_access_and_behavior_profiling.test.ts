import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  listAccessRulesAction,
  upsertAccessRuleAction,
  toggleGlobalAccessAction,
  analyzeContactBehaviorAction,
  listAccessRulesController,
  upsertAccessRuleController,
  toggleGlobalAccessController,
  analyzeContactBehaviorController,
} from "../../src/modules/owner/kanal";
import { AccessGate } from "../../src/modules/chat/pipeline/access-gate";

describe("Unit & Integrity Tests: Channel Access Rules, Multi-Channel Blacklist & Behavioral Profiling", () => {
  it("TEST 1: Verifikasi Migration 026: Skema tabel channel_access_rules", () => {
    const migrationPath = resolve(
      __dirname,
      "../../src/db/migrations/026_create_channel_access_rules.sql"
    );
    expect(existsSync(migrationPath)).toBe(true);

    const sqlContent = readFileSync(migrationPath, "utf-8");
    expect(sqlContent.includes("CREATE TABLE IF NOT EXISTS channel_access_rules")).toBe(true);
    expect(sqlContent.includes("owner_id uuid NOT NULL REFERENCES owners(id)")).toBe(true);
    expect(sqlContent.includes("channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram'))")).toBe(true);
    expect(sqlContent.includes("target_type text NOT NULL CHECK (target_type IN ('number', 'group'))")).toBe(true);
    expect(sqlContent.includes("status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'blocked'))")).toBe(true);
    expect(sqlContent.includes("persona_mode text NOT NULL DEFAULT 'admin' CHECK (persona_mode IN ('assistant', 'admin'))")).toBe(true);
    expect(sqlContent.includes("trigger_mode text NOT NULL DEFAULT 'mention_or_reply'")).toBe(true);
    expect(sqlContent.includes("behavior_summary text")).toBe(true);
    expect(sqlContent.includes("behavior_analyzed_at timestamptz")).toBe(true);
    expect(sqlContent.includes("idx_channel_access_lookup")).toBe(true);
    expect(sqlContent.includes("idx_channel_access_status")).toBe(true);
  });

  it("TEST 2: Verifikasi Strict Data Isolation: Tidak ada modifikasi atau penghapusan tabel bot_configs dan knowledge_base", () => {
    const migrationPath = resolve(
      __dirname,
      "../../src/db/migrations/026_create_channel_access_rules.sql"
    );
    const sqlContent = readFileSync(migrationPath, "utf-8");

    // Pastikan tidak ada DROP TABLE atau DELETE pada konfigurasi eksisting
    expect(sqlContent.includes("DROP TABLE bot_configs")).toBe(false);
    expect(sqlContent.includes("DROP TABLE knowledge_base")).toBe(false);
    expect(sqlContent.includes("DELETE FROM bot_configs")).toBe(false);
    expect(sqlContent.includes("DELETE FROM knowledge_base")).toBe(false);
  });

  it("TEST 3: Verifikasi Ekspor Modul Backend (Actions & Controllers)", () => {
    expect(typeof listAccessRulesAction).toBe("function");
    expect(typeof upsertAccessRuleAction).toBe("function");
    expect(typeof toggleGlobalAccessAction).toBe("function");
    expect(typeof analyzeContactBehaviorAction).toBe("function");
    expect(typeof listAccessRulesController).toBe("function");
    expect(typeof upsertAccessRuleController).toBe("function");
    expect(typeof toggleGlobalAccessController).toBe("function");
    expect(typeof analyzeContactBehaviorController).toBe("function");
  });

  it("TEST 4: Verifikasi Registrasi Rute Kanal di owner.ts", () => {
    const routePath = resolve(__dirname, "../../src/routes/owner.ts");
    const routeContent = readFileSync(routePath, "utf-8");

    expect(routeContent.includes('"/kanal/access-rules"')).toBe(true);
    expect(routeContent.includes('"/kanal/global-access"')).toBe(true);
    expect(routeContent.includes('"/kanal/analyze-behavior"')).toBe(true);
    expect(routeContent.includes("listAccessRulesController")).toBe(true);
    expect(routeContent.includes("upsertAccessRuleController")).toBe(true);
    expect(routeContent.includes("toggleGlobalAccessController")).toBe(true);
    expect(routeContent.includes("analyzeContactBehaviorController")).toBe(true);
  });

  it("TEST 5: Verifikasi Integrasi AccessGate di Chat Service Pipeline", () => {
    const chatServicePath = resolve(__dirname, "../../src/modules/chat/chat.service.ts");
    const serviceContent = readFileSync(chatServicePath, "utf-8");

    expect(serviceContent.includes("AccessGate.evaluate")).toBe(true);
    expect(serviceContent.includes("access.allowed")).toBe(true);
    expect(serviceContent.includes("access.groupPersona")).toBe(true);
  });

  it("TEST 6: Verifikasi Logika Multi-Kanal & Pemicu Grup pada AccessGate", () => {
    // Verifikasi bahwa AccessGate mengevaluasi mention, quote, dan tipe grup
    expect(typeof AccessGate.evaluate).toBe("function");

    const gatePath = resolve(__dirname, "../../src/modules/chat/pipeline/access-gate.ts");
    const gateContent = readFileSync(gatePath, "utf-8");

    expect(gateContent.includes("blocked_contact")).toBe(true);
    expect(gateContent.includes("whitelist_only")).toBe(true);
    expect(gateContent.includes("inactive_group")).toBe(true);
    expect(gateContent.includes("mention_or_reply")).toBe(true);
    expect(gateContent.includes("existingRule.persona_mode")).toBe(true);
  });

  it("TEST 7: Verifikasi AI Profiling Tier Authorization (Free locked to Nemotron, Pro allows tested models)", () => {
    const actionPath = resolve(
      __dirname,
      "../../src/modules/owner/kanal/actions/analyze-contact-behavior.action.ts"
    );
    const actionContent = readFileSync(actionPath, "utf-8");

    expect(actionContent.includes("getOwnerSubscriptionTierAction")).toBe(true);
    expect(actionContent.includes("nvidia/nemotron-3.5-lightning-free")).toBe(true);
    expect(actionContent.includes("sub.is_pro && input.model_id ? input.model_id : NEMOTRON_FREE")).toBe(true);
  });

  it("TEST 8: Verifikasi Kepatuhan AGENTS.md: Batas Ukuran Baris (< 400 baris) pada seluruh berkas baru/modifikasi", () => {
    const filesToCheck = [
      "../../src/db/migrations/026_create_channel_access_rules.sql",
      "../../src/modules/owner/kanal/kanal-access.types.ts",
      "../../src/modules/owner/kanal/actions/list-access-rules.action.ts",
      "../../src/modules/owner/kanal/actions/upsert-access-rule.action.ts",
      "../../src/modules/owner/kanal/actions/toggle-global-access.action.ts",
      "../../src/modules/owner/kanal/actions/analyze-contact-behavior.action.ts",
      "../../src/modules/owner/kanal/controllers/list-access-rules.controller.ts",
      "../../src/modules/owner/kanal/controllers/upsert-access-rule.controller.ts",
      "../../src/modules/owner/kanal/controllers/toggle-global-access.controller.ts",
      "../../src/modules/owner/kanal/controllers/analyze-contact-behavior.controller.ts",
      "../../src/modules/chat/pipeline/access-gate.ts",
      "../../src/routes/owner.ts",
      "../../src/modules/chat/chat.service.ts",
      "../../../web/src/panels/users/kanal/components/AllowedContactsCard.svelte",
      "../../../web/src/panels/users/kanal/components/AccessRulesFilterBar.svelte",
      "../../../web/src/panels/users/kanal/components/AccessRulesTableRow.svelte",
    ];

    for (const relPath of filesToCheck) {
      const fullPath = resolve(__dirname, relPath);
      expect(existsSync(fullPath)).toBe(true);
      const content = readFileSync(fullPath, "utf-8");
      const lineCount = content.split("\n").length;
      expect(lineCount).toBeLessThan(400);
    }
  });
});
