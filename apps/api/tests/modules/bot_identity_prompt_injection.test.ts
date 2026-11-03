import { describe, it, expect } from "bun:test";
import { withSystemContext } from "../../src/db/client";

describe("Verifikasi Injeksi Identitas Nama Bot ke Konfigurasi Prompt", () => {
  it("bot_configs harus menyimpan assistant_bot_name dan admin_bot_name secara terpisah", async () => {
    const ownerId = "50380ca6-9c51-45b5-8f3b-4f39e99fea0b"; // Toko Jasting

    await withSystemContext(async (tx) => {
      const [config] = await tx<{
        assistant_bot_name: string;
        admin_bot_name: string;
      }[]>`
        SELECT assistant_bot_name, admin_bot_name
        FROM bot_configs
        WHERE owner_id = ${ownerId}::uuid;
      `;

      expect(config).toBeDefined();
      expect(config.assistant_bot_name).toBe("Enbee asistant");
      expect(config.admin_bot_name).toBe("Samsul Jasting");
    });
  });
});
