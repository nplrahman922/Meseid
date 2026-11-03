import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { withSystemContext, withOwnerContext } from "../../src/db/client";
import { ChatService } from "../../src/modules/chat/chat.service";
import { getRecentConversationHistory } from "../../src/modules/chat/conversation.model";

describe("Tahap 5 Test Suite: Full End-to-End Chat Pipeline & 6-Layer Isolation", () => {
  const chatService = new ChatService();

  let testOwnerId: string;
  let testUserId: string;
  const testWaBotId = "62899990005";
  const testTgBotId = "bot123456789";

  const testOwnerPhone = "62811119999";
  const testCustomerPhone = "62855556666";

  const paceDelay = () => new Promise((resolve) => setTimeout(resolve, 3000));

  beforeAll(async () => {
    // 1. Dapatkan akun owner aktif
    await withSystemContext(async (tx) => {
      const [existingOwner] = await tx<{ id: string; user_id: string }[]>`
        SELECT o.id, o.user_id 
        FROM owners o 
        JOIN users u ON u.id = o.user_id 
        WHERE o.status = 'active' 
        LIMIT 1;
      `;
      testOwnerId = existingOwner.id;
      testUserId = existingOwner.user_id;
    });

    // 2. Hubungkan koneksi channel WhatsApp dan Telegram untuk owner ini
    await withOwnerContext(testOwnerId, testUserId, async (tx) => {
      await tx`
        DELETE FROM channel_connections 
        WHERE (channel = 'whatsapp' AND external_account_id = ${testWaBotId})
           OR (channel = 'telegram' AND external_account_id = ${testTgBotId});
      `;

      await tx`
        INSERT INTO channel_connections (owner_id, channel, external_account_id, status)
        VALUES
          (${testOwnerId}::uuid, 'whatsapp', ${testWaBotId}, 'connected'),
          (${testOwnerId}::uuid, 'telegram', ${testTgBotId}, 'connected');
      `;

      // Setup Bot Config
      await tx`
        INSERT INTO bot_configs (
          owner_id, assistant_bot_name, assistant_persona_prompt,
          admin_bot_name, admin_persona_prompt
        )
        VALUES (
          ${testOwnerId}::uuid,
          'Meseid AI Partner',
          'Sapa dengan "Siap Bos!" dan prioritaskan pembukuan presisi.',
          'Admin Jasting',
          'Sapa ramah, santai, dan sebut "Kakak" atau "Sobat Jasting".'
        )
        ON CONFLICT (owner_id) DO UPDATE
        SET assistant_persona_prompt = 'Sapa dengan "Siap Bos!" dan prioritaskan pembukuan presisi.',
            admin_persona_prompt = 'Sapa ramah, santai, dan sebut "Kakak" atau "Sobat Jasting".';
      `;

      // Setup Knowledge Base
      await tx`
        DELETE FROM knowledge_base WHERE owner_id = ${testOwnerId}::uuid;
      `;

      await tx`
        INSERT INTO knowledge_base (owner_id, category, title, content, is_internal)
        VALUES
          (${testOwnerId}::uuid, 'produk', 'Paket Starter Cloud', 'Paket Starter seharga Rp 99.000/bln sudah termasuk SSL dan 1 domain.', false),
          (${testOwnerId}::uuid, 'kebijakan', 'Garansi Uang Kembali', 'Refund 100% dapat diajukan dalam 7 hari kerja.', false),
          (${testOwnerId}::uuid, 'operasional', 'SOP Server Internal', 'Biaya server AWS internal Rp 1.500.000/bln dengan BEP 16 user.', true);
      `;
    });
  });

  afterAll(async () => {
    // Bersihkan channel mock
    await withOwnerContext(testOwnerId, testUserId, async (tx) => {
      await tx`
        DELETE FROM channel_connections 
        WHERE (channel = 'whatsapp' AND external_account_id = ${testWaBotId})
           OR (channel = 'telegram' AND external_account_id = ${testTgBotId});
      `;
    });

    // Bersihkan pesan & percakapan
    await withSystemContext(async (tx) => {
      await tx`
        DELETE FROM inbound_messages 
        WHERE (channel = 'whatsapp' AND sender_id = ${testCustomerPhone})
           OR (channel = 'telegram' AND sender_id = ${testOwnerPhone});
      `;
      await tx`
        DELETE FROM conversation_messages 
        WHERE owner_id = ${testOwnerId}::uuid;
      `;
    });
  });

  it("TEST 5.1: Multi-Turn Percakapan Pelanggan dengan Memory Distiller & KB Resmi (WhatsApp)", async () => {
    await paceDelay();
    // Turn 1: Pelanggan memperkenalkan diri dan menanyakan paket
    const msgId1 = `wa_cust_turn1_${Date.now()}`;
    const res1 = await chatService.processInboundMessage({
      channel: "whatsapp",
      external_message_id: msgId1,
      bot_id: testWaBotId,
      sender_id: testCustomerPhone,
      sender_name: "Budi Pratama",
      is_from_me: false, // Pelanggan
      is_group: false,
      timestamp: Date.now(),
      text: "Halo min, nama saya Budi dari Bandung, mau tanya paket starter cloud harganya berapa ya?",
    });

    expect(res1.status).toBe("success");
    expect(res1.reply_text).toBeTruthy();
    expect(
      res1.reply_text.includes("99.000") ||
      res1.reply_text.includes("99k") ||
      res1.reply_text.toLowerCase().includes("starter")
    ).toBe(true);

    await paceDelay();

    // Turn 2: Pelanggan menanyakan garansi tanpa menyebutkan nama lagi
    const msgId2 = `wa_cust_turn2_${Date.now()}`;
    const res2 = await chatService.processInboundMessage({
      channel: "whatsapp",
      external_message_id: msgId2,
      bot_id: testWaBotId,
      sender_id: testCustomerPhone,
      sender_name: "Budi Pratama",
      is_from_me: false,
      is_group: false,
      timestamp: Date.now(),
      text: "Kalau garansi uang kembalinya berapa hari ya?",
    });

    expect(res2.status).toBe("success");
    expect(
      res2.reply_text.includes("7 hari") ||
      res2.reply_text.toLowerCase().includes("refund") ||
      res2.reply_text.toLowerCase().includes("garansi")
    ).toBe(true);

    // Verifikasi tersimpan di conversation_messages
    await withSystemContext(async (tx) => {
      const history = await getRecentConversationHistory(tx, {
        ownerId: testOwnerId,
        channel: "whatsapp",
        senderId: testCustomerPhone,
        isOwner: false,
      });

      expect(history.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
    });
  }, 60000);

  it("TEST 5.2: Multi-Item Accounting Transaction Booking (Telegram)", async () => {
    await paceDelay();
    const msgIdTg = `tg_owner_multitx_${Date.now()}`;
    const resTg = await chatService.processInboundMessage({
      channel: "telegram",
      external_message_id: msgIdTg,
      bot_id: testTgBotId,
      sender_id: testOwnerPhone,
      sender_name: "Owner Meseid",
      is_from_me: true, // Owner
      is_group: false,
      timestamp: Date.now(),
      text: "Catat pengeluaran: beli tinta printer 85rb dan bayar wifi 350rb",
    });

    expect(resTg.status).toBe("success");
    expect(resTg.reply_text).toBeTruthy();

    // Verifikasi jurnal tercatat di PostgreSQL dengan RLS owner context
    await withOwnerContext(testOwnerId, testUserId, async (tx) => {
      const journals = await tx<{ id: string; description: string }[]>`
        SELECT id, description 
        FROM jurnal_umum 
        WHERE owner_id = ${testOwnerId}::uuid AND source_ref = ${msgIdTg};
      `;

      expect(journals.length).toBeGreaterThanOrEqual(1);

      // Verifikasi seluruh jurnal seimbang debit = kredit
      for (const j of journals) {
        const lines = await tx<{ debit: number; credit: number }[]>`
          SELECT debit, credit FROM jurnal_baris WHERE journal_id = ${j.id}::uuid;
        `;
        const totalDebit = lines.reduce((acc, l) => acc + Number(l.debit), 0);
        const totalCredit = lines.reduce((acc, l) => acc + Number(l.credit), 0);
        expect(totalDebit).toBe(totalCredit);
        expect(totalDebit).toBeGreaterThan(0);
      }
    });
  }, 45000);

  it("TEST 5.3: Audit Isolasi Ketat 6-Lapis (Antar Saluran, Pengirim, dan Peran)", async () => {
    await withSystemContext(async (tx) => {
      // 1. Riwayat pelanggan WhatsApp
      const waCustomerHistory = await getRecentConversationHistory(tx, {
        ownerId: testOwnerId,
        channel: "whatsapp",
        senderId: testCustomerPhone,
        isOwner: false,
      });

      // 2. Riwayat owner Telegram
      const tgOwnerHistory = await getRecentConversationHistory(tx, {
        ownerId: testOwnerId,
        channel: "telegram",
        senderId: testOwnerPhone,
        isOwner: true,
      });

      expect(waCustomerHistory.length).toBeGreaterThanOrEqual(2);
      expect(tgOwnerHistory.length).toBeGreaterThanOrEqual(2);

      // Pastikan TIDAK ADA chat owner di riwayat pelanggan
      const leakInCustomer = waCustomerHistory.find(
        (m) => m.content.includes("tinta printer") || m.content.includes("wifi 350rb")
      );
      expect(leakInCustomer).toBeUndefined();

      // Pastikan TIDAK ADA chat pelanggan di riwayat owner
      const leakInOwner = tgOwnerHistory.find(
        (m) => m.content.includes("Budi dari Bandung") || m.content.includes("garansi uang kembali")
      );
      expect(leakInOwner).toBeUndefined();
    });
  });
});
