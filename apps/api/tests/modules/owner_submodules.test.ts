import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { signSession } from "../../src/lib/session";

describe("Tahap 2: Decomposed Owner Sub-modules (profile, personalisasi, kb, onboarding)", () => {
  let ownerToken: string;
  let ownerId: string;
  let userId: string;

  beforeAll(async () => {
    await runSeed();

    // Lookup seeded Owner A
    const [ownerRow] = await adminSql`
      SELECT o.id as owner_id, o.user_id, u.email
      FROM owners o
      JOIN users u ON u.id = o.user_id
      WHERE u.email = 'budi@warkopnusantara.id';
    `;

    expect(ownerRow).toBeDefined();
    ownerId = ownerRow.owner_id;
    userId = ownerRow.user_id;

    ownerToken = signSession({
      userId: ownerRow.user_id,
      email: ownerRow.email,
      role: "owner",
    });
  });

  // ==========================================
  // 1. Profile Sub-module
  // ==========================================
  describe("Profile Sub-module", () => {
    it("PUT /api/owner/profile updates phone, custom_business_type, and business_description", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            business_name: "Warkop & Roastery Premium",
            business_type: "lainnya",
            custom_business_type: "Artisan Coffee Roastery",
            business_description: "Spesialis sangrai biji kopi nusantara arabika & robusta",
            phone: "+6281234567890",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.owner.business_name).toBe("Warkop & Roastery Premium");
      expect(json.owner.custom_business_type).toBe("Artisan Coffee Roastery");
      expect(json.owner.business_description).toContain("Spesialis sangrai");
      expect(json.owner.phone).toBe("+6281234567890");
    });
  });

  // ==========================================
  // 2. Personalisasi Sub-module
  // ==========================================
  describe("Personalisasi Sub-module", () => {
    it("PUT /api/owner/personalisasi automatically compiles chips and custom rules", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/personalisasi", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            admin_bot_name: "Barista Bot",
            speaking_styles: ["Ramah", "Informatif", "Santun"],
            custom_rules: ["Jangan tanya dua kali", "Sebutkan nama toko dengan bangga"],
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.config.admin_bot_name).toBe("Barista Bot");
      expect(json.config.admin_persona_prompt).toContain("Gaya Bicara: Ramah, Informatif, Santun");
      expect(json.config.admin_persona_prompt).toContain("Jangan tanya dua kali");
      expect(json.config.assistant_persona_prompt).toContain("asisten internal pribadi");
    });

    it("GET /api/owner/personalisasi returns the persisted bot configuration", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/personalisasi", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.config.admin_bot_name).toBe("Barista Bot");
    });
  });

  // ==========================================
  // 3. Knowledge Base Sub-module
  // ==========================================
  describe("Knowledge Base Sub-module", () => {
    let createdKbId: string;

    it("POST /api/owner/kb creates a single knowledge base article with custom category and is_internal", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/kb", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            category: "Resep Rahasia Kopi",
            title: "Rasio Es Kopi Susu Aren",
            content: "Rasio espresso 30ml, gula aren 20ml, susu segar 100ml. Rahasia dapur internal.",
            is_internal: true,
          }),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.item.category).toBe("Resep Rahasia Kopi");
      expect(json.item.is_internal).toBe(true);
      createdKbId = json.item.id;
    });

    it("POST /api/owner/kb/batch creates multiple articles at once", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/kb/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            items: [
              {
                category: "Jam Buka",
                title: "Jam Operasional Toko",
                content: "Buka setiap hari 08:00 - 22:00 WIB.",
                is_internal: false,
              },
              {
                category: "Pembayaran",
                title: "Metode Pembayaran",
                content: "Menerima QRIS, Tunai, dan Transfer BCA.",
                is_internal: false,
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.count).toBe(2);
      expect(json.items.length).toBe(2);
    });

    it("GET /api/owner/kb retrieves the list of articles with internal filter", async () => {
      const resAll = await app.handle(
        new Request("http://localhost/api/owner/kb", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        })
      );
      expect(resAll.status).toBe(200);
      const jsonAll = (await resAll.json()) as any;
      expect(jsonAll.status).toBe("ok");
      expect(jsonAll.items.length).toBeGreaterThanOrEqual(3);

      // Filter public only
      const resPublic = await app.handle(
        new Request("http://localhost/api/owner/kb?is_internal=false", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        })
      );
      expect(resPublic.status).toBe(200);
      const jsonPublic = (await resPublic.json()) as any;
      for (const item of jsonPublic.items) {
        expect(item.is_internal).toBe(false);
      }
    });

    it("DELETE /api/owner/kb/:id removes the article", async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/owner/kb/${createdKbId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        })
      );
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // 4. Onboarding Sub-module
  // ==========================================
  describe("Onboarding Sub-module", () => {
    it("POST /api/owner/onboarding executes atomic setup across profile, bot_configs, and KB", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            userName: "Budi Santoso",
            businessName: "Kopi Kenangan Senja",
            businessType: "kuliner",
            customCategory: "Coffee & Pastry",
            businessDescription: "Kedai kopi spesialis biji single origin lokal",
            ownerPhone: "+6281299988877",
            phoneVerified: true,
            personalization: {
              botName: "Senja Assistant",
              speakingStyles: ["Hangat", "Cepat tanggap"],
              customRules: ["Utamakan senyum dan keramahan"],
            },
            knowledgeBase: [
              {
                category: "Menu",
                title: "Menu Andalan",
                content: "Kopi Susu Senja & Croissant Almond.",
                is_internal: false,
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.summary.businessName).toBe("Kopi Kenangan Senja");
      expect(json.summary.onboardingCompleted).toBe(true);
      expect(json.summary.kbCount).toBe(1);
    });

    it("GET /api/owner/onboarding-status confirms completion", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/owner/onboarding-status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe("ok");
      expect(json.onboarding.onboardingCompleted).toBe(true);
      expect(json.onboarding.businessName).toBe("Kopi Kenangan Senja");
      expect(json.onboarding.phone).toBe("+6281299988877");
      expect(json.onboarding.kbCount).toBeGreaterThanOrEqual(1);
    });
  });
});
