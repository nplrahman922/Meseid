import { describe, it, expect } from "bun:test";
import { handleWhatsAppLoggedOutAction } from "../../src/modules/bot/actions/handle-whatsapp-logged-out.action";

describe("handleWhatsAppLoggedOutAction Unit Tests", () => {
  it("resolves ownerId from rawOwnerId if valid UUID", async () => {
    let executedQuery = false;
    const fakeTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      executedQuery = true;
      return [{ id: "mock-conn-id" }];
    };

    const validOwnerUuid = "b51dcb75-e0eb-4c6b-8c8c-f02845aa5f1f";
    const result = await handleWhatsAppLoggedOutAction(
      fakeTx,
      "owner_b51dcb75_e0eb_4c6b_8c8c_f02845aa5f1f",
      validOwnerUuid
    );

    expect(result.success).toBe(true);
    expect(result.ownerId).toBe(validOwnerUuid);
    expect(result.affectedRows).toBe(1);
    expect(executedQuery).toBe(true);
  });

  it("extracts ownerId from sessionId format owner_<uuid_with_underscores>", async () => {
    let executedQuery = false;
    const fakeTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      executedQuery = true;
      return [{ id: "mock-conn-id-2" }];
    };

    const targetUuid = "12345678-1234-1234-1234-123456789abc";
    const sessionId = `owner_12345678_1234_1234_1234_123456789abc`;

    const result = await handleWhatsAppLoggedOutAction(fakeTx, sessionId);

    expect(result.success).toBe(true);
    expect(result.ownerId).toBe(targetUuid);
    expect(result.affectedRows).toBe(1);
    expect(executedQuery).toBe(true);
  });

  it("falls back to session_ref match if sessionId does not contain UUID", async () => {
    let executedQuery = false;
    const fakeTx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
      executedQuery = true;
      return [];
    };

    const sessionId = "custom_session_ref_123";
    const result = await handleWhatsAppLoggedOutAction(fakeTx, sessionId);

    expect(result.success).toBe(true);
    expect(result.ownerId).toBeUndefined();
    expect(result.affectedRows).toBe(0);
    expect(executedQuery).toBe(true);
  });
});
