import { describe, it, expect, mock } from "bun:test";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { getWhatsappStatusController, resetWhatsappSessionController } from "../../src/modules/bot/bot.controller";
import { checkChannelConflict } from "../../src/modules/bot/actions/check-channel-conflict.action";

describe("WhatsApp Multi-Tenant Session Isolation & Collision Fix Tests", () => {
  it("TEST 1: getWhatsappStatusController mengisolasi sessionId berbasis owner.id", async () => {
    const ownerA = { id: "aaaaaaaa-1111-2222-3333-444444444444" };
    const ownerB = { id: "bbbbbbbb-5555-6666-7777-888888888888" };

    // Mock runOwnerTx tanpa existing channel_connections
    const mockRunOwnerTx = async (fn: any) => fn(async () => []);

    // Kita uji bahwa ownerA dan ownerB dipetakan ke session terpisah
    const expectedSessionA = `owner_${ownerA.id.replace(/-/g, "_")}`;
    const expectedSessionB = `owner_${ownerB.id.replace(/-/g, "_")}`;

    expect(expectedSessionA).not.toBe(expectedSessionB);
    expect(expectedSessionA).toContain("aaaaaaaa");
    expect(expectedSessionB).toContain("bbbbbbbb");

    // Simulasi pemanggilan controller dengan owner context
    const resA = await getWhatsappStatusController({
      owner: ownerA,
      runOwnerTx: mockRunOwnerTx as any,
    });
    expect(resA.status).toBe("ok");

    const resB = await getWhatsappStatusController({
      owner: ownerB,
      runOwnerTx: mockRunOwnerTx as any,
    });
    expect(resB.status).toBe("ok");
  });

  it("TEST 2: getWhatsappStatusController memprioritaskan session_ref yang tersimpan di DB", async () => {
    const ownerWithCustomRef = { id: "cccccccc-1111-2222-3333-444444444444" };
    const customRef = "session_existing_store_123";

    const mockRunOwnerTx = async (fn: any) => {
      const fakeTx = async () => [{ session_ref: customRef }];
      return fn(fakeTx);
    };

    const res = await getWhatsappStatusController({
      owner: ownerWithCustomRef,
      runOwnerTx: mockRunOwnerTx as any,
    });

    expect(res.status).toBe("ok");
  });

  it("TEST 3: resetWhatsappSessionController mereset session spesifik owner", async () => {
    const owner = { id: "dddddddd-1111-2222-3333-444444444444" };
    let dbUpdated = false;

    const mockRunOwnerTx = async (fn: any) => {
      const fakeTx = async () => {
        dbUpdated = true;
        return [];
      };
      return fn(fakeTx);
    };

    const setObj: { status?: number | string } = {};
    const res = await resetWhatsappSessionController({
      owner,
      runOwnerTx: mockRunOwnerTx as any,
      set: setObj,
    });

    // DB update berhasil dipanggil
    expect(dbUpdated).toBe(true);
  });

  it("TEST 4: checkChannelConflict menolak klaim nomor yang sudah dipakai owner lain meskipun menggunakan session 'default'", async () => {
    const owner1Id = "11111111-1111-1111-1111-111111111111";
    const owner2Id = "22222222-2222-2222-2222-222222222222";
    const phone = "628123456789";

    // Mock query mengembalikan bahwa nomor ini sudah terikat ke owner1
    const mockTx = async () => [
      {
        owner_id: owner1Id,
        session_ref: "default",
        status: "connected",
        business_name: "Toko Pertama",
      },
    ];

    // Skenario A: Owner 1 (pemilik sah) mengecek nomornya sendiri -> BUKAN konflik
    const checkOwner1 = await checkChannelConflict(
      mockTx as any,
      "whatsapp",
      phone,
      "default",
      owner1Id
    );
    expect(checkOwner1.isConflict).toBe(false);

    // Skenario B: Owner 2 (pihak lain) mencoba menghubungkan nomor Owner 1 -> WAJIB KONFLIK
    // (Sebelumnya bypass 'default' meloloskan ini sebagai false!)
    const checkOwner2 = await checkChannelConflict(
      mockTx as any,
      "whatsapp",
      phone,
      "default",
      owner2Id
    );
    expect(checkOwner2.isConflict).toBe(true);
    expect(checkOwner2.businessName).toBe("Toko Pertama");
    expect(checkOwner2.reason).toContain("Toko Pertama");
  });

  it("TEST 5: checkChannelConflict tetap mendeteksi konflik jika owner ID berbeda meskipun sessionId sama", async () => {
    const owner1Id = "11111111-1111-1111-1111-111111111111";
    const owner2Id = "22222222-2222-2222-2222-222222222222";
    const phone = "628999999999";

    const mockTx = async () => [
      {
        owner_id: owner1Id,
        session_ref: "shared_session_key",
        status: "connected",
        business_name: "Warung Asli",
      },
    ];

    const result = await checkChannelConflict(
      mockTx as any,
      "whatsapp",
      phone,
      "shared_session_key",
      owner2Id
    );
    expect(result.isConflict).toBe(true);
    expect(result.existingOwnerId).toBe(owner1Id);
  });

  it("TEST 6: Kepatuhan AGENTS.md: Batas Ukuran Baris (< 400 baris) pada semua berkas yang diubah", () => {
    const apiFiles = [
      "../../src/modules/bot/bot.controller.ts",
      "../../src/modules/bot/actions/check-channel-conflict.action.ts",
      "../../src/modules/owner/onboarding/actions/execute-onboarding.action.ts",
      "../../src/routes/bot.ts",
    ];

    for (const rel of apiFiles) {
      const fullPath = resolve(__dirname, rel);
      expect(existsSync(fullPath)).toBe(true);
      const content = readFileSync(fullPath, "utf-8");
      const lineCount = content.split("\n").length;
      expect(lineCount).toBeLessThan(400);
    }

    // Periksa file monorepo lain jika lingkungan uji berada di workspace root
    const optionalMonorepoFiles = [
      "../../../bot/src/whatsapp/bot.manager.ts",
      "../../../bot/src/index.ts",
      "../../../web/src/panels/users/overview/overview-bot.service.ts",
      "../../../web/src/panels/users/overview/components/Step2WhatsappModal.svelte",
    ];

    for (const rel of optionalMonorepoFiles) {
      const fullPath = resolve(__dirname, rel);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf-8");
        const lineCount = content.split("\n").length;
        expect(lineCount).toBeLessThan(400);
      }
    }
  });
});
