import { describe, it, expect } from "bun:test";
import { adminSql } from "../../src/db/client";
import { getOnboardingDetail } from "../../src/modules/owner/onboarding/actions/get-onboarding-detail.action";
import { executeOnboardingTransaction } from "../../src/modules/owner/onboarding/actions/execute-onboarding.action";

describe("Tahap 11: Onboarding Detail & Pre-fill Architecture Test Suite", () => {
  it("TEST 11.1: Memverifikasi kolom owner_name pada tabel owners hasil migrasi 020", async () => {
    const columns = await adminSql<{ column_name: string; data_type: string }[]>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'owners' AND column_name = 'owner_name';
    `;

    expect(columns.length).toBe(1);
    expect(columns[0].data_type).toBe("text");
  });

  it("TEST 11.2: Memverifikasi penyimpanan userName ke owner_name dan pembacaan kembali oleh getOnboardingDetail", async () => {
    const [owner] = await adminSql<{ id: string }[]>`
      SELECT id FROM owners LIMIT 1;
    `;

    expect(owner).toBeTruthy();

    await adminSql.begin(async (tx) => {
      // 1. Eksekusi onboarding dengan userName kustom
      await executeOnboardingTransaction(tx, owner.id, {
        userName: "Rifqi Test",
        businessName: "Jasting Solusi Digital",
        businessType: "jasa",
        ownerPhone: "08123456789",
        personalization: {
          botName: "Admin Jasting",
          assistantBotName: "Enbee Asisten",
          speakingStyles: ["Ramah", "Santai"],
          customRules: ["Panggil pelanggan dengan Kakak"],
          assistantSpeakingStyles: ["Lugas", "Responsif"],
          assistantCustomRules: ["Panggil owner dengan Tuan Muda"],
        },
        knowledgeBase: [
          {
            title: "Paket Website UMKM",
            category: "layanan",
            content: "Paket kilat harga 500rb",
            is_internal: false,
          },
        ],
      });

      // 2. Query onboarding detail
      const detail = await getOnboardingDetail(tx, owner.id);

      expect(detail.userName).toBe("Rifqi Test");
      expect(detail.businessName).toBe("Jasting Solusi Digital");
      expect(detail.storeBotName).toBe("Admin Jasting");
      expect(detail.assistantBotName).toBe("Enbee Asisten");
      expect(detail.knowledgeBase.length).toBeGreaterThanOrEqual(1);
      expect(detail.knowledgeBase.some((k) => k.title === "Paket Website UMKM")).toBe(true);

      // 3. Verifikasi fallback userName jika owner_name kosong tidak boleh mengambil business_name
      await tx`UPDATE owners SET owner_name = NULL WHERE id = ${owner.id}::uuid;`;
      const fallbackDetail = await getOnboardingDetail(tx, owner.id);
      expect(fallbackDetail.userName).not.toBe("Jasting Solusi Digital");
      expect(fallbackDetail.businessName).toBe("Jasting Solusi Digital");
    });
  });
});
