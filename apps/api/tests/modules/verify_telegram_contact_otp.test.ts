import { describe, it, expect } from "bun:test";
import { verifyTelegramContactAndGenerateOtp } from "../../src/modules/bot/actions/verify-telegram-contact-and-generate-otp.action";

describe("verifyTelegramContactAndGenerateOtp Unit Tests", () => {
  it("rejects if bot is not found in channel_connections", async () => {
    const fakeTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      return []; // No connection found
    };

    const result = await verifyTelegramContactAndGenerateOtp(
      fakeTx,
      "non_existent_bot",
      "12345678",
      "+6281234567890"
    );

    expect(result.success).toBe(false);
    expect(result.reason).toBe("BOT_NOT_FOUND");
  });

  it("rejects if owner has not configured a phone number in profile", async () => {
    let callIndex = 0;
    const fakeTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      callIndex++;
      if (callIndex === 1) {
        return [{ owner_id: "b51dcb75-e0eb-4c6b-8c8c-f02845aa5f1f" }];
      }
      return [{ phone: null }]; // Owner has no phone set
    };

    const result = await verifyTelegramContactAndGenerateOtp(
      fakeTx,
      "bot_123",
      "12345678",
      "+6281234567890"
    );

    expect(result.success).toBe(false);
    expect(result.reason).toBe("OWNER_PHONE_NOT_SET");
  });

  it("rejects with PHONE_MISMATCH if contact phone does not match owner profile", async () => {
    let callIndex = 0;
    const fakeTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      callIndex++;
      if (callIndex === 1) {
        return [{ owner_id: "b51dcb75-e0eb-4c6b-8c8c-f02845aa5f1f" }];
      }
      return [{ phone: "081385266775" }]; // Owner phone
    };

    const attackerPhone = "+628999888777"; // Attacker Telegram phone
    const result = await verifyTelegramContactAndGenerateOtp(
      fakeTx,
      "bot_123",
      "99999999",
      attackerPhone
    );

    expect(result.success).toBe(false);
    expect(result.reason).toBe("PHONE_MISMATCH");
    expect(result.error).toContain("tidak cocok");
  });

  it("generates 6-digit OTP when contact phone matches owner phone (E.164 normalized)", async () => {
    let callIndex = 0;
    let insertedLinkCode = false;

    const fakeTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      callIndex++;
      if (callIndex === 1) {
        return [{ owner_id: "b51dcb75-e0eb-4c6b-8c8c-f02845aa5f1f" }];
      }
      if (callIndex === 2) {
        return [{ phone: "081385266775" }]; // Stored with leading 0
      }
      insertedLinkCode = true;
      return [];
    };

    const telegramSharedPhone = "+6281385266775"; // Shared with +62
    const result = await verifyTelegramContactAndGenerateOtp(
      fakeTx,
      "bot_123",
      "12345678",
      telegramSharedPhone
    );

    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    expect(result.code?.length).toBe(6);
    expect(insertedLinkCode).toBe(true);
  });
});
