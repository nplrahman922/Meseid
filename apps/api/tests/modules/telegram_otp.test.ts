import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { signSession } from "../../src/lib/session";
import { env } from "../../src/config/env";

describe("Tahap 12: Telegram Inverted OTP Verification Test Suite", () => {
  let ownerToken: string;
  let ownerId: string;
  const botId = "123456789";
  const ownerChatId = "987654321";

  beforeAll(async () => {
    await runSeed();

    const [ownerRow] = await adminSql`
      SELECT o.id as owner_id, o.user_id, u.email
      FROM owners o
      JOIN users u ON u.id = o.user_id
      WHERE u.email = 'budi@warkopnusantara.id';
    `;

    expect(ownerRow).toBeDefined();
    ownerId = ownerRow.owner_id;

    ownerToken = signSession({
      userId: ownerRow.user_id,
      email: ownerRow.email,
      role: "owner",
    });
  });

  it("POST /api/internal/telegram/generate-otp menolak permintaan tanpa secret internal", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/internal/telegram/generate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: botId, chat_id: ownerChatId }),
      })
    );

    expect(res.status).toBe(401);
  });

  it("POST /api/internal/telegram/generate-otp membuat kode OTP 6 digit di database", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/internal/telegram/generate-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": env.INTERNAL_API_SECRET,
        },
        body: JSON.stringify({ bot_id: botId, chat_id: ownerChatId }),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string; code?: string };
    expect(json.status).toBe("ok");
    expect(json.code).toBeDefined();
    expect(json.code?.length).toBe(6);

    const generatedCode = json.code!;

    // 1. Verifikasi kode salah ditolak
    const failRes = await app.handle(
      new Request("http://localhost/api/bot/telegram/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ code: "000000" }),
      })
    );
    expect(failRes.status).toBe(400);

    // 2. Verifikasi kode benar berhasil dan mengikat chat_id
    const successRes = await app.handle(
      new Request("http://localhost/api/bot/telegram/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ code: generatedCode }),
      })
    );

    expect(successRes.status).toBe(200);
    const successJson = (await successRes.json()) as { status: string; chatId: string };
    expect(successJson.status).toBe("ok");
    expect(successJson.chatId).toBe(ownerChatId);

    // 3. Pastikan kode tidak bisa dipakai ulang
    const replayRes = await app.handle(
      new Request("http://localhost/api/bot/telegram/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ code: generatedCode }),
      })
    );
    expect(replayRes.status).toBe(400);
  });
});
