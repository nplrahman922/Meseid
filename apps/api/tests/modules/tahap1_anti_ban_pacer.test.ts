import { describe, it, expect } from "bun:test";
import { ChatPacer } from "../../../../apps/bot/src/common/chat.pacer";

describe("Tahap 1 Test Suite: Dynamic Anti-Ban Pacer & Burst Buffer Engine", () => {
  it("TEST 1.1: Buffer debounce sukses menggabungkan 3 pesan beruntun menjadi 1 teks utuh", async () => {
    const pacer = new ChatPacer({ debounceMs: 150 });
    let flushedText = "";
    let presenceCallCount = 0;

    const promise = new Promise<void>((resolve) => {
      // Kirim chat 1
      pacer.enqueueMessage({
        channel: "whatsapp",
        botId: "bot-01",
        senderId: "user-01",
        chatId: "chat-01",
        messageId: "msg-1",
        text: "Halo kak",
        payload: { test: true },
        sendPresence: async () => {
          presenceCallCount++;
        },
        onFlush: async (mergedText) => {
          flushedText = mergedText;
          resolve();
        },
      });

      // Kirim chat 2 setelah 50ms (masih dalam jendela 150ms)
      setTimeout(() => {
        pacer.enqueueMessage({
          channel: "whatsapp",
          botId: "bot-01",
          senderId: "user-01",
          chatId: "chat-01",
          messageId: "msg-2",
          text: "mau tanya harga paket website",
          payload: { test: true },
          sendPresence: async () => {
            presenceCallCount++;
          },
          onFlush: async (mergedText) => {
            flushedText = mergedText;
            resolve();
          },
        });
      }, 50);

      // Kirim chat 3 setelah 100ms
      setTimeout(() => {
        pacer.enqueueMessage({
          channel: "whatsapp",
          botId: "bot-01",
          senderId: "user-01",
          chatId: "chat-01",
          messageId: "msg-3",
          text: "yang ada toko onlinenya ya",
          payload: { test: true },
          sendPresence: async () => {
            presenceCallCount++;
          },
          onFlush: async (mergedText) => {
            flushedText = mergedText;
            resolve();
          },
        });
      }, 100);
    });

    await promise;

    expect(flushedText).toBe(
      "Halo kak\nmau tanya harga paket website\nyang ada toko onlinenya ya"
    );
    expect(presenceCallCount).toBeGreaterThanOrEqual(3);
  });

  it("TEST 1.2: Koreksi pesan (edit chat) dalam jendela buffer sukses memperbarui teks yang akan dikirim", async () => {
    const pacer = new ChatPacer({ debounceMs: 150 });
    let flushedText = "";

    const promise = new Promise<void>((resolve) => {
      // 1. Kirim pesan typo
      pacer.enqueueMessage({
        channel: "telegram",
        botId: "tg-bot-01",
        senderId: "tg-user-01",
        chatId: "tg-chat-01",
        messageId: "tg-msg-101",
        text: "Tolong catat beli bnsin 25rb",
        payload: { channel: "telegram" },
        sendPresence: async () => {},
        onFlush: async (mergedText) => {
          flushedText = mergedText;
          resolve();
        },
      });

      // 2. Koreksi typo setelah 50ms
      setTimeout(() => {
        const updated = pacer.updateEditedMessage(
          "telegram",
          "tg-bot-01",
          "tg-user-01",
          "tg-msg-101",
          "Tolong catat beli bensin 25rb"
        );
        expect(updated).toBe(true);
      }, 50);
    });

    await promise;

    // Pastikan teks yang terkirim ke AI adalah teks yang sudah dikoreksi
    expect(flushedText).toBe("Tolong catat beli bensin 25rb");
  });

  it("TEST 1.3: Pacing WhatsApp terbukti dinamis berada dalam rentang 7 s/d 15 detik (Anti-Ban)", () => {
    const pacer = new ChatPacer({
      minDelayWaMs: 7000,
      maxDelayWaMs: 15000,
    });

    for (let i = 0; i < 20; i++) {
      const delay = pacer.calculateDynamicDelay("whatsapp", 50);
      expect(delay).toBeGreaterThanOrEqual(7000);
      expect(delay).toBeLessThanOrEqual(15000);
    }
  });

  it("TEST 1.4: Pacing Telegram terbukti adaptif berada dalam rentang 4 s/d 8 detik", () => {
    const pacer = new ChatPacer({
      minDelayTgMs: 4000,
      maxDelayTgMs: 8000,
    });

    for (let i = 0; i < 20; i++) {
      const delay = pacer.calculateDynamicDelay("telegram", 80);
      expect(delay).toBeGreaterThanOrEqual(4000);
      expect(delay).toBeLessThanOrEqual(8000);
    }
  });

  it("TEST 1.5: Sinyal presence loop aktif selama masa tunggu buffer", async () => {
    const pacer = new ChatPacer({ debounceMs: 250 });
    let presenceCalls = 0;

    await new Promise<void>((resolve) => {
      pacer.enqueueMessage({
        channel: "whatsapp",
        botId: "bot-02",
        senderId: "user-02",
        chatId: "chat-02",
        messageId: "msg-presence-1",
        text: "Pesan uji presence",
        payload: {},
        sendPresence: async () => {
          presenceCalls++;
        },
        onFlush: async () => {
          resolve();
        },
      });
    });

    expect(presenceCalls).toBeGreaterThanOrEqual(1);
  });
});
