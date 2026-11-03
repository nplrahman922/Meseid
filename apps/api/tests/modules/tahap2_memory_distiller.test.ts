import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { withSystemContext } from "../../src/db/client";
import {
  saveConversationMessage,
  getRecentConversationHistory,
} from "../../src/modules/chat/conversation.model";
import { aiAdapter } from "../../src/adapters/ai";

describe("Tahap 2 Test Suite: Long-History Memory Distiller & 6-Layer Isolation", () => {
  let ownerId: string;
  const testCustomerSenderId = "test-customer-08123456789";
  const testOwnerSenderId = "test-owner-08999999999";

  beforeAll(async () => {
    await withSystemContext(async (tx) => {
      const [owner] = await tx<{ id: string }[]>`SELECT id FROM owners LIMIT 1;`;
      ownerId = owner.id;

      // Bersihkan chat test sebelumnya jika ada
      await tx`
        DELETE FROM conversation_messages
        WHERE owner_id = ${ownerId}::uuid
          AND sender_id IN (${testCustomerSenderId}, ${testOwnerSenderId});
      `;
    });
  });

  afterAll(async () => {
    await withSystemContext(async (tx) => {
      await tx`
        DELETE FROM conversation_messages
        WHERE owner_id = ${ownerId}::uuid
          AND sender_id IN (${testCustomerSenderId}, ${testOwnerSenderId});
      `;
    });
  });

  it("TEST 2.1: Menyimpan dan mengambil riwayat percakapan dengan isolasi pengirim & peran", async () => {
    await withSystemContext(async (tx) => {
      // Simpan 2 chat pelanggan
      await saveConversationMessage(tx, {
        ownerId,
        channel: "whatsapp",
        senderId: testCustomerSenderId,
        isOwner: false,
        persona: "admin",
        role: "user",
        content: "Halo admin, mau tanya harga paket website",
      });

      await saveConversationMessage(tx, {
        ownerId,
        channel: "whatsapp",
        senderId: testCustomerSenderId,
        isOwner: false,
        persona: "admin",
        role: "assistant",
        content: "Halo Kak! Paket website di Jasting mulai Rp 2.500.000.",
      });

      // Simpan 1 chat privat owner
      await saveConversationMessage(tx, {
        ownerId,
        channel: "whatsapp",
        senderId: testOwnerSenderId,
        isOwner: true,
        persona: "assistant",
        role: "user",
        content: "Catat pengeluaran sewa server 1.500.000",
      });

      // Ambil riwayat chat pelanggan
      const customerHistory = await getRecentConversationHistory(tx, {
        ownerId,
        channel: "whatsapp",
        senderId: testCustomerSenderId,
        isOwner: false,
      });

      expect(customerHistory.length).toBe(2);
      expect(customerHistory[0].content).toContain("tanya harga paket website");
      expect(customerHistory[1].content).toContain("mulai Rp 2.500.000");

      // Verifikasi TIDAK ADA chat owner di riwayat pelanggan (Isolasi Terjamin)
      const leakedOwnerChat = customerHistory.find((c) =>
        c.content.includes("sewa server")
      );
      expect(leakedOwnerChat).toBeUndefined();
    });
  });

  it("TEST 2.2: Isolasi antar saluran: Chat Telegram tidak bocor ke WhatsApp", async () => {
    await withSystemContext(async (tx) => {
      // Simpan chat di Telegram untuk sender yang sama
      await saveConversationMessage(tx, {
        ownerId,
        channel: "telegram",
        senderId: testCustomerSenderId,
        isOwner: false,
        persona: "admin",
        role: "user",
        content: "Pesan khusus saluran Telegram",
      });

      // Ambil riwayat saluran WhatsApp
      const waHistory = await getRecentConversationHistory(tx, {
        ownerId,
        channel: "whatsapp",
        senderId: testCustomerSenderId,
        isOwner: false,
      });

      // Verifikasi pesan Telegram tidak muncul di WhatsApp
      const tgInWa = waHistory.find((c) =>
        c.content.includes("khusus saluran Telegram")
      );
      expect(tgInWa).toBeUndefined();

      // Ambil riwayat saluran Telegram
      const tgHistory = await getRecentConversationHistory(tx, {
        ownerId,
        channel: "telegram",
        senderId: testCustomerSenderId,
        isOwner: false,
      });
      expect(tgHistory.length).toBe(1);
      expect(tgHistory[0].content).toBe("Pesan khusus saluran Telegram");
    });
  });

  it("TEST 2.3: Mengambil 25+ riwayat pesan terurut secara kronologis (lama ke baru)", async () => {
    await withSystemContext(async (tx) => {
      // Masukkan 22 pesan beruntun
      for (let i = 1; i <= 22; i++) {
        await saveConversationMessage(tx, {
          ownerId,
          channel: "whatsapp",
          senderId: testCustomerSenderId,
          isOwner: false,
          persona: "admin",
          role: i % 2 === 1 ? "user" : "assistant",
          content: `Pesan pengujian nomor ${i}`,
        });
      }

      const history = await getRecentConversationHistory(tx, {
        ownerId,
        channel: "whatsapp",
        senderId: testCustomerSenderId,
        isOwner: false,
        limit: 30,
      });

      expect(history.length).toBeGreaterThanOrEqual(22);
      // Urutan kronologis: pesan pertama harus lebih lama dari pesan terakhir
      const firstTime = new Date(history[0].created_at).getTime();
      const lastTime = new Date(history[history.length - 1].created_at).getTime();
      expect(firstTime).toBeLessThanOrEqual(lastTime);
    });
  });

  it("TEST 2.4: Model Free Tier inclusionai/ling-3.1-flash-1019 sukses meringkas 20+ riwayat menjadi Memory Digest", async () => {
    // Siapkan 20 riwayat percakapan simulasi
    const mockHistory: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: "Halo kak, salam kenal" },
      { role: "assistant", content: "Halo! Selamat datang di Jasting. Ada yang bisa kami bantu?" },
      { role: "user", content: "Saya mau buat website untuk toko baju muslim saya" },
      { role: "assistant", content: "Bagus sekali! Kami punya Paket Toko Online Rp 2.500.000 sudah include domain dan hosting." },
      { role: "user", content: "Apakah sudah bisa integrasi WhatsApp untuk checkout?" },
      { role: "assistant", content: "Sudah include Kak, tombol checkout langsung terhubung ke WhatsApp admin." },
      { role: "user", content: "Pengerjaannya kira-kira berapa lama ya?" },
      { role: "assistant", content: "Rata-rata 3 sampai 7 hari kerja tergantung kelengkapan materi produk." },
      { role: "user", content: "Kalau saya mau minta revisi desain warnanya gimana?" },
      { role: "assistant", content: "Gratis revisi minor hingga 3 kali Kak." },
      { role: "user", content: "Bisa dapat diskon gak kalau saya bayar lunas hari ini?" },
      { role: "assistant", content: "Ketentuan kami DP 50% di awal dan pelunasan saat selesai Kak." },
      { role: "user", content: "Oke saya paham. Terus untuk katalog produknya saya yang upload atau dibantu?" },
      { role: "assistant", content: "Kami bantu upload 20 produk pertama, selebihnya ada panduan mudahnya." },
      { role: "user", content: "Bagus deh kalau dibantu upload awal." },
      { role: "assistant", content: "Siap Kak, kami pastikan tampilan mobile-nya responsif dan cepat." },
      { role: "user", content: "Nama domain yang saya mau: bajumuslimahkece.com" },
      { role: "assistant", content: "Nama domain yang menarik! Domain tersebut akan kami cek ketersediaannya." },
      { role: "user", content: "Sip, tolong amankan domainnya ya." },
      { role: "assistant", content: "Baik Kak, siap kami proses setelah konfirmasi pembayaran." },
    ];

    const latestMessage = "Bisa nego harganya jadi 2.2 juta gak ya Kak?";

    // Panggil model Free Tier inclusionai/ling-3.1-flash-1019
    const digest = await aiAdapter.distillConversationContext(mockHistory, latestMessage);

    expect(digest).toBeDefined();
    expect(typeof digest).toBe("string");
    expect(digest!.length).toBeGreaterThan(15);

    // Intisari harus menangkap konteks website / toko baju / nego
    const lowerDigest = digest!.toLowerCase();
    const hasContext =
      lowerDigest.includes("website") ||
      lowerDigest.includes("toko") ||
      lowerDigest.includes("baju") ||
      lowerDigest.includes("nego") ||
      lowerDigest.includes("harga") ||
      lowerDigest.includes("jasting");

    expect(hasContext).toBe(true);
  }, 20000); // Beri timeout 20s untuk network call AI

  it("TEST 2.5: distillConversationContext mengembalikan null jika riwayat pesan kosong", async () => {
    const digest = await aiAdapter.distillConversationContext([], "Halo pertama kali");
    expect(digest).toBeNull();
  });
});
