import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../../src";
import { adminSql } from "../../src/db/client";
import { runSeed } from "../../src/db/seed";
import { signSession } from "../../src/lib/session";
import { normalizePhoneNumber } from "../../src/modules/bot/bot.otp.service";

describe("Tahap 3: Bot OTP Service & Outbound Verification", () => {
  let ownerToken: string;
  let ownerId: string;

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

  it("normalizePhoneNumber properly converts variations to standard format", () => {
    expect(normalizePhoneNumber("081234567890")).toBe("6281234567890");
    expect(normalizePhoneNumber("+6281234567890")).toBe("6281234567890");
    expect(normalizePhoneNumber("+62 812-3456-7890")).toBe("6281234567890");
  });

  it("POST /api/bot/otp/send generates OTP and stores hashed record in channel_link_codes", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          phone: "+62 812-9988-7766",
          channel: "whatsapp",
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.targetPhone).toBe("6281299887766");
    expect(json.devCode).toBeDefined();
    expect(json.devCode.length).toBe(6);

    // Verify row in channel_link_codes
    const [row] = await adminSql`
      SELECT channel, target_external_id, used_at, expires_at
      FROM channel_link_codes
      WHERE owner_id = ${ownerId}::uuid
        AND target_external_id = '6281299887766'
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    expect(row).toBeDefined();
    expect(row.channel).toBe("whatsapp");
    expect(row.used_at).toBeNull();
  });

  it("POST /api/bot/otp/verify rejects invalid 6-digit code", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/bot/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          phone: "6281299887766",
          code: "000000",
        }),
      })
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error).toBe("INVALID_OTP");
  });

  it("POST /api/bot/otp/verify marks code as used and updates owner phone on correct code", async () => {
    // 1. Send OTP
    const sendRes = await app.handle(
      new Request("http://localhost/api/bot/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          phone: "+6281311223344",
          channel: "whatsapp",
        }),
      })
    );
    const sendJson = (await sendRes.json()) as any;
    const validCode = sendJson.devCode;

    // 2. Verify with valid code
    const verifyRes = await app.handle(
      new Request("http://localhost/api/bot/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          phone: "+6281311223344",
          code: validCode,
        }),
      })
    );

    expect(verifyRes.status).toBe(200);
    const verifyJson = (await verifyRes.json()) as any;
    expect(verifyJson.verified).toBe(true);

    // 3. Confirm owner phone updated in database
    const [owner] = await adminSql`
      SELECT phone FROM owners WHERE id = ${ownerId}::uuid;
    `;
    expect(owner.phone).toBe("6281311223344");

    // 4. Second attempt with same code must fail (already used)
    const secondRes = await app.handle(
      new Request("http://localhost/api/bot/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          phone: "+6281311223344",
          code: validCode,
        }),
      })
    );
    expect(secondRes.status).toBe(400);
  });
});
