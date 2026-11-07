import { describe, it, expect } from "bun:test";
import { successResponse } from "../../src/logs/response.template";

describe("Response Template Safety Tests", () => {
  it("enforces status: 'ok' even if payload contains status: 'connecting'", () => {
    const payload = {
      status: "connecting",
      sessionId: "owner_123",
      message: "raw internal bot message",
    };

    const res = successResponse(payload, "Pesan sukses pengguna");

    expect(res.status).toBe("ok");
    expect(res.message).toBe("Pesan sukses pengguna");
    expect(res.sessionId).toBe("owner_123");
  });

  it("retains status: 'ok' when payload has no conflicting keys", () => {
    const payload = {
      data: { id: "test" },
    };

    const res = successResponse(payload, "Sukses");

    expect(res.status).toBe("ok");
    expect(res.message).toBe("Sukses");
    expect(res.data.id).toBe("test");
  });
});
