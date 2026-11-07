import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { signSession } from "../../src/lib/session";
import { env } from "../../src/config/env";

describe("E2E Test: Owner Phone Change & Telegram Inverted OTP Access Rules", () => {
  let ownerToken: string;
  let ownerId: string;
  let otherOwnerToken: string;
  let otherOwnerId: string;

  beforeAll(async () => {
    await runSeed();

    // Primary owner: budi
    const [budi] = await adminSql`
      SELECT o.id as owner_id, o.user_id, u.email
      FROM owners o
      JOIN users u ON u.id = o.user_id
      WHERE u.email = 'budi@warkopnusantara.id';
    `;
    expect(budi).toBeDefined();
    ownerId = budi.owner_id;
    ownerToken = signSession({
      userId: budi.user_id,
      email: budi.email,
      role: "owner",
    });

    // Secondary owner: siti
    const [siti] = await adminSql`
      SELECT o.id as owner_id, o.user_id, u.email
      FROM owners o
      JOIN users u ON u.id = o.user_id
      WHERE u.email = 'siti@tokoberkahjaya.id';
    `;
    expect(siti).toBeDefined();
    otherOwnerId = siti.owner_id;
    otherOwnerToken = signSession({
      userId: siti.user_id,
      email: siti.email,
      role: "owner",
    });
  });

  describe("1. WhatsApp Phone Number Change & Access Rules Synchronization", () => {
    it("Mengganti nomor WhatsApp owner menyinkronkan owners, bot_configs, dan channel_access_rules", async () => {
      const newPhone = "+62 813-8888-7777";
      const normalizedPhone = "6281388887777";

      // 1. Kirim OTP untuk nomor baru
      const sendRes = await app.handle(
        new Request("http://localhost/api/bot/otp/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({ phone: newPhone, channel: "whatsapp" }),
        })
      );
      expect(sendRes.status).toBe(200);
      const sendJson = (await sendRes.json()) as any;
      expect(sendJson.status).toBe("ok");
      expect(sendJson.devCode).toBeDefined();
      const otpCode = sendJson.devCode;

      // 2. Verifikasi OTP dengan nomor baru
      const verifyRes = await app.handle(
        new Request("http://localhost/api/bot/otp/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({ phone: newPhone, code: otpCode }),
        })
      );
      expect(verifyRes.status).toBe(200);
      const verifyJson = (await verifyRes.json()) as any;
      expect(verifyJson.verified).toBe(true);

      // 3. Pastikan tabel owners ter-update
      const [updatedOwner] = await adminSql`
        SELECT phone FROM owners WHERE id = ${ownerId}::uuid;
      `;
      expect(updatedOwner.phone).toBe(normalizedPhone);

      // 4. Pastikan bot_configs.allowed_contacts memuat nomor baru
      const [botCfg] = await adminSql`
        SELECT allowed_contacts FROM bot_configs WHERE owner_id = ${ownerId}::uuid;
      `;
      expect(botCfg).toBeDefined();
      expect(botCfg.allowed_contacts).toContain(normalizedPhone);

      // 5. Pastikan channel_access_rules memiliki entri aktif sebagai owner
      const [rule] = await adminSql`
        SELECT channel, target_type, target_id, persona_mode, status, custom_label
        FROM channel_access_rules
        WHERE owner_id = ${ownerId}::uuid
          AND channel = 'whatsapp'
          AND target_id = ${normalizedPhone};
      `;
      expect(rule).toBeDefined();
      expect(rule.persona_mode).toBe("assistant");
      expect(rule.status).toBe("active");
    });
  });

  describe("2. Telegram Inverted OTP & Access Rules Synchronization", () => {
    it("Verifikasi OTP Telegram mengikat chat_id ke channel_access_rules dengan hak asisten & owner", async () => {
      const telegramBotId = "123456789";
      const telegramChatId = "5544332211";
      const telegramUsername = "budi_warkop_tg";

      // 1. Simulasikan bot Telegram menerima /otp dan memanggil internal generate-otp
      const genRes = await app.handle(
        new Request("http://localhost/api/internal/telegram/generate-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": env.INTERNAL_API_SECRET,
          },
          body: JSON.stringify({
            bot_id: telegramBotId,
            chat_id: telegramChatId,
            username: telegramUsername,
          }),
        })
      );
      expect(genRes.status).toBe(200);
      const genJson = (await genRes.json()) as { status: string; code?: string };
      expect(genJson.code).toBeDefined();
      const tgOtp = genJson.code!;

      // 2. Owner memverifikasi kode OTP Telegram melalui dashboard web
      const verifyRes = await app.handle(
        new Request("http://localhost/api/bot/telegram/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({ code: tgOtp }),
        })
      );
      expect(verifyRes.status).toBe(200);
      const verifyJson = (await verifyRes.json()) as { status: string; chatId: string };
      expect(verifyJson.status).toBe("ok");
      expect(verifyJson.chatId).toBe(telegramChatId);

      // 3. Pastikan channel_access_rules mencatat Telegram chat_id sebagai assistant aktif
      const [tgRule] = await adminSql`
        SELECT channel, target_type, target_id, target_name, persona_mode, status, custom_label
        FROM channel_access_rules
        WHERE owner_id = ${ownerId}::uuid
          AND channel = 'telegram'
          AND target_id = ${telegramChatId};
      `;
      expect(tgRule).toBeDefined();
      expect(tgRule.persona_mode).toBe("assistant");
      expect(tgRule.status).toBe("active");
      expect(tgRule.custom_label).toBe("Owner / Pemilik");

      // 4. Pastikan kode OTP yang sama tidak dapat digunakan kembali oleh tenant lain
      const replayRes = await app.handle(
        new Request("http://localhost/api/bot/telegram/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${otherOwnerToken}`,
          },
          body: JSON.stringify({ code: tgOtp }),
        })
      );
      expect(replayRes.status).toBe(400);
    });
  });
});
