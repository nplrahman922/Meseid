import { describe, it, expect } from "bun:test";
import { withOwnerContext, appSql } from "../../src/db/client";
import {
  getOnboardingDetail,
  executeOnboardingTransaction,
} from "../../src/modules/owner/onboarding/onboarding.model";

describe("Tahap 7 Test Suite: Overview Pre-fill & Clean Sync Knowledge Base", () => {
  const JASTING_OWNER_ID = "50380ca6-9c51-45b5-8f3b-4f39e99fea0b";
  let ownerUserId = "";

  it("TEST 7.1: Mengambil detail konfigurasi lengkap (getOnboardingDetail) untuk Pre-fill Overview", async () => {
    // Ambil user_id untuk owner Jasting
    const [ownerRow] = await appSql<{ user_id: string }[]>`
      SELECT user_id FROM owners WHERE id = ${JASTING_OWNER_ID}::uuid;
    `;
    expect(ownerRow).toBeTruthy();
    ownerUserId = ownerRow.user_id;

    const detail = await withOwnerContext(JASTING_OWNER_ID, ownerUserId, async (tx) => {
      return await getOnboardingDetail(tx, JASTING_OWNER_ID);
    });

    expect(detail).toBeTruthy();
    expect(detail.businessName).toBe("Jasting");
    expect(detail.businessType).toBeTruthy();
    expect(detail.assistantBotName).toBe("Enbee asistant");
    expect(detail.storeBotName).toBe("Samsul Jasting");
    expect(Array.isArray(detail.knowledgeBase)).toBe(true);
    expect(detail.knowledgeBase.length).toBeGreaterThan(0);
    // Pastikan tidak ada garansi 7 hari kerja yang tersisa
    const hasObsoleteGuarantee = detail.knowledgeBase.some(
      (kb) => kb.title.toLowerCase().includes("garansi") || kb.description.includes("7 hari kerja")
    );
    expect(hasObsoleteGuarantee).toBe(false);
  });

  it("TEST 7.2: Clean Sync Knowledge Base menggantikan item lama secara bersih tanpa menumpuk", async () => {
    const testItems = [
      {
        category: "produk",
        title: "Paket Starter Cloud Sync Test",
        content: "Paket Starter seharga Rp 99.000/bln sudah termasuk SSL dan 1 domain.",
        is_internal: false,
      },
      {
        category: "layanan",
        title: "Layanan Pembuatan Aplikasi Web & Mobile",
        content: "Jasting melayani jasa pembuatan website dan aplikasi android profesional.",
        is_internal: false,
      },
    ];

    const result = await withOwnerContext(JASTING_OWNER_ID, ownerUserId, async (tx) => {
      return await executeOnboardingTransaction(tx, JASTING_OWNER_ID, {
        businessName: "Jasting",
        businessType: "jasa",
        businessDescription: "Jasa pembuatan software dan SaaS",
        ownerPhone: "6281385266775",
        personalization: {
          botName: "Samsul Jasting",
          assistantBotName: "Enbee asistant",
        },
        knowledgeBase: testItems,
      });
    });

    expect(result.kbCount).toBe(2);

    // Verifikasi langsung di database bahwa hanya ada 2 item (tidak menumpuk di atas data lama)
    const detailAfterSync = await withOwnerContext(JASTING_OWNER_ID, ownerUserId, async (tx) => {
      return await getOnboardingDetail(tx, JASTING_OWNER_ID);
    });

    expect(detailAfterSync.knowledgeBase.length).toBe(2);
    expect(detailAfterSync.knowledgeBase[0].title).toBe("Paket Starter Cloud Sync Test");
    expect(detailAfterSync.knowledgeBase[1].title).toBe("Layanan Pembuatan Aplikasi Web & Mobile");
  });

  it("TEST 7.3: Memulihkan Knowledge Base resmi Jasting secara bersih (Clean Restore)", async () => {
    const originalJastingKb = [
      {
        category: "produk",
        title: "Paket Starter Cloud",
        content: "Paket Starter seharga Rp 99.000/bln sudah termasuk SSL dan 1 domain.",
        is_internal: false,
      },
      {
        category: "operasional",
        title: "SOP Server Internal",
        content: "Biaya server AWS internal Rp 1.500.000/bln dengan BEP 16 user.",
        is_internal: true,
      },
      {
        category: "Informasi",
        title: "Informasi Seputar jasting",
        content: "Jasting merupakan layanan yang berfokus dalam menerima pemesanan seputar pembuatan aplikasi dan website dengan berbagai macam pendekatan teknologi terbaru, dimana jasting sudah menggunakan teknologi docker , node js , bun js , redis , postgresql , sebagai dasar pembuatan layanan program",
        is_internal: false,
      },
      {
        category: "Harga Produk",
        title: "Pricelist Harga jasa layanan jasting",
        content: "Harga layanan jasting:\n- Website Company Profile : Open only 500k non negotiable\n- Pembuatana sistem informasi berbasi web : Open only 1,5 jt - 10 jt negotiable\n- Pembuatan layanan aplikasi android : Open only 3jt - 50 jt negotiable",
        is_internal: false,
      },
      {
        category: "cara sapa owner",
        title: "tata cara panggil owner",
        content: "Pastikan kamu panggiol owner dengan sebutan \"Tuan Muda\"",
        is_internal: true,
      },
    ];

    const result = await withOwnerContext(JASTING_OWNER_ID, ownerUserId, async (tx) => {
      return await executeOnboardingTransaction(tx, JASTING_OWNER_ID, {
        businessName: "Jasting",
        businessType: "jasa",
        businessDescription: "Menyediakan jasa layanan pembuatan website maupun aplikasi desktop maupun mobile.",
        ownerPhone: "6281385266775",
        personalization: {
          botName: "Samsul Jasting",
          assistantBotName: "Enbee asistant",
        },
        knowledgeBase: originalJastingKb,
      });
    });

    expect(result.kbCount).toBe(5);

    const finalDetail = await withOwnerContext(JASTING_OWNER_ID, ownerUserId, async (tx) => {
      return await getOnboardingDetail(tx, JASTING_OWNER_ID);
    });

    expect(finalDetail.knowledgeBase.length).toBe(5);
    expect(finalDetail.assistantBotName).toBe("Enbee asistant");
    expect(finalDetail.storeBotName).toBe("Samsul Jasting");
  });
});
