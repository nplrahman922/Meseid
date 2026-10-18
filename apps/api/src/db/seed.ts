import { adminSql } from "./client";

export const SEED_IDS = {
  ADMIN_USER: "00000000-0000-0000-0000-000000000001",
  OWNER_A_USER: "00000000-0000-0000-0000-000000000010",
  OWNER_A_ID: "00000000-0000-0000-0000-000000000011",
  OWNER_A_SUPPLIER_1: "00000000-0000-0000-0000-000000000012",
  OWNER_A_CUSTOMER_1: "00000000-0000-0000-0000-000000000013",
  OWNER_A_SUPPLIER_2: "00000000-0000-0000-0000-000000000014",
  OWNER_B_USER: "00000000-0000-0000-0000-000000000020",
  OWNER_B_ID: "00000000-0000-0000-0000-000000000021",
  OWNER_C_USER: "00000000-0000-0000-0000-000000000030",
  OWNER_C_ID: "00000000-0000-0000-0000-000000000031",
};

function assertNonProductionAndLocal() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cannot run seed script in production environment (NODE_ENV=production)!");
  }
  const dbUrl = process.env.DATABASE_URL || "";
  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname.toLowerCase();
    const allowed = ["localhost", "127.0.0.1", "postgres", "::1", "0.0.0.0"];
    if (!allowed.includes(host)) {
      throw new Error(`Cannot run seed script on non-local host: ${host}`);
    }
  } catch (err: any) {
    if (err.message.includes("non-local")) throw err;
  }
}

export async function runSeed() {
  assertNonProductionAndLocal();

  console.log(">> [Meseid Seed] Starting idempotent database seeding...");

  await adminSql.begin(async (tx) => {
    // 0. Seed AI Models (Moved from migrations per Fix F)
    await tx`
      INSERT INTO ai_models (provider, model_id, tier, currency, enabled, price_input_per_1m, price_output_per_1m)
      VALUES
        ('google', 'gemini-1.5-flash', 'free', 'IDR', true, 1.1500, 4.6000),
        ('google', 'gemini-1.5-pro', 'pro', 'IDR', true, 53.0000, 210.0000),
        ('openai', 'gpt-4o-mini', 'free', 'IDR', true, 2.3000, 9.2000),
        ('openai', 'gpt-4o', 'pro', 'IDR', true, 38.0000, 150.0000)
      ON CONFLICT (model_id) DO UPDATE 
      SET enabled = EXCLUDED.enabled,
          currency = EXCLUDED.currency,
          price_input_per_1m = EXCLUDED.price_input_per_1m,
          price_output_per_1m = EXCLUDED.price_output_per_1m;
    `;

    // Fetch Plan IDs
    const plans = await tx<{ id: string; name: string }[]>`
      SELECT id, name FROM plans WHERE name IN ('gratis', 'pro');
    `;
    const gratisPlan = plans.find((p) => p.name === "gratis");
    const proPlan = plans.find((p) => p.name === "pro");

    if (!gratisPlan || !proPlan) {
      throw new Error("Required plans 'gratis' and 'pro' not found. Run migrations first.");
    }

    // Clean existing deterministic seed data idempotently
    await tx`
      DELETE FROM owners WHERE id IN (
        ${SEED_IDS.OWNER_A_ID},
        ${SEED_IDS.OWNER_B_ID},
        ${SEED_IDS.OWNER_C_ID}
      ) OR user_id IN (
        SELECT id FROM users WHERE google_sub IN (
          'admin-google-sub-001',
          'owner-a-sub-001',
          'owner1-google-sub-001',
          'owner-b-sub-002',
          'owner2-google-sub-002',
          'owner-c-sub-003'
        ) OR email IN (
          'budi@warkopnusantara.id',
          'siti@tokoberkahjaya.id',
          'agus@bengkelcepat.id',
          'admin@meseid.id'
        )
      );
    `;

    await tx`
      DELETE FROM users WHERE google_sub IN (
        'admin-google-sub-001',
        'owner-a-sub-001',
        'owner1-google-sub-001',
        'owner-b-sub-002',
        'owner2-google-sub-002',
        'owner-c-sub-003'
      ) OR email IN (
        'budi@warkopnusantara.id',
        'siti@tokoberkahjaya.id',
        'agus@bengkelcepat.id',
        'admin@meseid.id'
      ) OR id IN (
        ${SEED_IDS.ADMIN_USER},
        ${SEED_IDS.OWNER_A_USER},
        ${SEED_IDS.OWNER_B_USER},
        ${SEED_IDS.OWNER_C_USER}
      );
    `;

    // 1. Seed 1 Admin User (email from env)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@meseid.id";
    await tx`
      INSERT INTO users (id, google_sub, email, role, status)
      VALUES (${SEED_IDS.ADMIN_USER}, 'admin-google-sub-001', ${adminEmail}, 'admin', 'active')
      ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email, role = EXCLUDED.role, status = EXCLUDED.status;
    `;

    // 2. Seed Owner A (Pro, WhatsApp + Telegram connected, Google connected, Kuliner)
    await tx`
      INSERT INTO users (id, google_sub, email, role, status)
      VALUES (${SEED_IDS.OWNER_A_USER}, 'owner-a-sub-001', 'budi@warkopnusantara.id', 'owner', 'active');
    `;

    await tx`
      INSERT INTO owners (id, user_id, business_name, business_type, timezone, status)
      VALUES (${SEED_IDS.OWNER_A_ID}, ${SEED_IDS.OWNER_A_USER}, 'Warkop Nusantara', 'kuliner', 'Asia/Jakarta', 'active');
    `;

    // Channel connections for Owner A: WhatsApp + Telegram with encrypted credentials
    await tx`
      INSERT INTO channel_connections (owner_id, channel, external_account_id, status, session_ref, credentials_enc)
      VALUES 
        (${SEED_IDS.OWNER_A_ID}, 'whatsapp', '6281234567890', 'connected', 'session_wa_warkop_001', decode('aabbccddeeff00112233445566778899', 'hex')),
        (${SEED_IDS.OWNER_A_ID}, 'telegram', '123456789', 'connected', 'session_tg_warkop_001', decode('11223344556677889900aabbccddeeff', 'hex'));
    `;

    // Channel link code for Owner A (SRS FR-31)
    await tx`
      INSERT INTO channel_link_codes (owner_id, channel, target_external_id, code_hash, expires_at)
      VALUES (${SEED_IDS.OWNER_A_ID}, 'whatsapp', '6281234567890', 'hash_otp_123456', now() + interval '10 minutes');
    `;

    // Google Connected with FAKE Encrypted Placeholders
    await tx`
      INSERT INTO google_connections (
        owner_id, scopes, refresh_token_enc, access_token_enc, token_expires_at, calendar_id, drive_root_folder_id, status
      )
      VALUES (
        ${SEED_IDS.OWNER_A_ID},
        ARRAY['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/drive'],
        decode('0102030405060708090a0b0c0d0e0f10', 'hex'),
        decode('1112131415161718191a1b1c1d1e1f20', 'hex'),
        now() + interval '1 hour',
        'warkop_cal_001@group.calendar.google.com',
        'drive_folder_warkop_root_001',
        'connected'
      );
    `;

    // Bot Config for Owner A (Dual-Persona & Whitelist aligned with SRS)
    await tx`
      INSERT INTO bot_configs (
        owner_id, 
        assistant_bot_name, 
        assistant_persona_prompt,
        admin_bot_name,
        admin_persona_prompt,
        persona_prompt, 
        selected_model_id,
        customer_access_mode,
        auto_reply_enabled, 
        business_hours
      )
      VALUES (
        ${SEED_IDS.OWNER_A_ID},
        'Asisten Bisnis Warkop',
        'Kamu adalah asisten internal pemilik bisnis Warkop Nusantara untuk pembukuan dan stok.',
        'Admin Toko Warkop',
        'Kamu adalah asisten ramah Warkop Nusantara yang melayani pesanan pelanggan.',
        'Kamu adalah asisten ramah Warkop Nusantara yang melayani pesanan kopi dan makanan ringan.',
        'gemini-1.5-flash',
        'open',
        true,
        '{"monday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "09:00", "close": "23:00"}}'::jsonb
      );
    `;

    // Subscription for Owner A: Pro
    await tx`
      INSERT INTO subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
      VALUES (${SEED_IDS.OWNER_A_ID}, ${proPlan.id}, 'active', now(), now() + interval '30 days');
    `;

    // Payment History for Owner A
    await tx`
      INSERT INTO payment_history (owner_id, order_id, product_type, gross_amount, status, signature_verified, metadata)
      VALUES (
        ${SEED_IDS.OWNER_A_ID},
        'ORDER-PRO-SEED-001',
        'subscription',
        49000.00,
        'settlement',
        true,
        '{"plan": "pro", "activated": true}'::jsonb
      );
    `;

    // Quota Counter & Token Topup for Owner A
    const jktFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
    const ownerAToday = jktFmt.format(new Date());
    const ownerAMonth = ownerAToday.slice(0, 7);

    await tx`
      INSERT INTO quota_counters (owner_id, period_type, period_key, tokens_used)
      VALUES 
        (${SEED_IDS.OWNER_A_ID}, 'month', ${ownerAMonth}, 15000)
      ON CONFLICT (owner_id, period_type, period_key) DO UPDATE
      SET tokens_used = EXCLUDED.tokens_used;
    `;

    await tx`
      INSERT INTO token_topups (owner_id, tokens_purchased, tokens_remaining, expires_at, status)
      VALUES (${SEED_IDS.OWNER_A_ID}, 500000, 500000, now() + interval '90 days', 'active');
    `;

    // Parties for Owner A (receivables & payables)
    await tx`
      INSERT INTO parties (id, owner_id, name, type, phone, notes)
      VALUES
        (${SEED_IDS.OWNER_A_SUPPLIER_1}, ${SEED_IDS.OWNER_A_ID}, 'CV Kopi Gayo', 'supplier', '628111222333', 'Supplier biji kopi Arabika Gayo'),
        (${SEED_IDS.OWNER_A_CUSTOMER_1}, ${SEED_IDS.OWNER_A_ID}, 'PT Maju Bersama', 'customer', '628222333444', 'Pelanggan katering event kantor'),
        (${SEED_IDS.OWNER_A_SUPPLIER_2}, ${SEED_IDS.OWNER_A_ID}, 'UD Susu Segar Jaya', 'supplier', '628333444555', 'Supplier susu kental manis');
    `;

    // Look up default accounts for Owner A
    const accountsA = await tx<{ id: string; code: string; type: string }[]>`
      SELECT id, code, type FROM accounts WHERE owner_id = ${SEED_IDS.OWNER_A_ID};
    `;
    const accMapA = new Map(accountsA.map((a) => [a.code, a.id]));

    const kasId = accMapA.get("1101")!;
    const bankId = accMapA.get("1102")!;
    const piutangId = accMapA.get("1103")!;
    const utangId = accMapA.get("2101")!;
    const modalId = accMapA.get("3101")!;
    const revId = accMapA.get("4101")!;
    const hppId = accMapA.get("5101")!;
    const gajiId = accMapA.get("6101")!;
    const sewaId = accMapA.get("6102")!;
    const listrikId = accMapA.get("6103")!;
    const promoId = accMapA.get("6104") || hppId;

    // Post ~20 Journals via fn_post_journal (including receivables & payables)
    const journalEntries = [
      // 1. Initial capital
      {
        header: { tx_date: "2026-10-01", description: "Setoran modal awal usaha", source: "manual" },
        lines: [
          { account_id: kasId, debit: 10000000, credit: 0 },
          { account_id: modalId, debit: 0, credit: 10000000 },
        ],
      },
      // 2. Transfer cash to bank
      {
        header: { tx_date: "2026-10-01", description: "Pembukaan rekening operasional Bank Mandiri", source: "manual" },
        lines: [
          { account_id: bankId, debit: 5000000, credit: 0 },
          { account_id: kasId, debit: 0, credit: 5000000 },
        ],
      },
      // 3. Purchase coffee beans cash
      {
        header: { tx_date: "2026-10-02", description: "Pembelian biji kopi Robusta tunai", source: "manual" },
        lines: [
          { account_id: hppId, debit: 450000, credit: 0 },
          { account_id: kasId, debit: 0, credit: 450000 },
        ],
      },
      // 4. Purchase coffee beans on credit (Payable to CV Kopi Gayo) -> generates buku_pembantu
      {
        header: { tx_date: "2026-10-03", description: "Pembelian bahan baku kopi kredit dari CV Kopi Gayo", source: "ocr" },
        lines: [
          { account_id: hppId, debit: 1500000, credit: 0 },
          { account_id: utangId, debit: 0, credit: 1500000, party_id: SEED_IDS.OWNER_A_SUPPLIER_1, due_date: "2026-11-03" },
        ],
      },
      // 5. Daily sales cash
      {
        header: { tx_date: "2026-10-03", description: "Pendapatan penjualan tunai warkop", source: "text" },
        lines: [
          { account_id: kasId, debit: 850000, credit: 0 },
          { account_id: revId, debit: 0, credit: 850000 },
        ],
      },
      // 6. Milk purchase on credit (Payable to UD Susu Segar Jaya) -> generates buku_pembantu
      {
        header: { tx_date: "2026-10-04", description: "Pembelian persediaan susu kental manis kredit", source: "ocr" },
        lines: [
          { account_id: hppId, debit: 750000, credit: 0 },
          { account_id: utangId, debit: 0, credit: 750000, party_id: SEED_IDS.OWNER_A_SUPPLIER_2, due_date: "2026-10-25" },
        ],
      },
      // 7. Catering sales on credit (Receivable from PT Maju Bersama) -> generates buku_pembantu
      {
        header: { tx_date: "2026-10-05", description: "Penjualan paket kopi event kantor PT Maju Bersama", source: "text" },
        lines: [
          { account_id: piutangId, debit: 2500000, credit: 0, party_id: SEED_IDS.OWNER_A_CUSTOMER_1, due_date: "2026-10-20" },
          { account_id: revId, debit: 0, credit: 2500000 },
        ],
      },
      // 8. Daily sales cash
      {
        header: { tx_date: "2026-10-05", description: "Pendapatan penjualan tunai harian", source: "manual" },
        lines: [
          { account_id: kasId, debit: 1200000, credit: 0 },
          { account_id: revId, debit: 0, credit: 1200000 },
        ],
      },
      // 9. Utility expense (Electricity & Water)
      {
        header: { tx_date: "2026-10-06", description: "Pembayaran tagihan listrik dan air", source: "manual" },
        lines: [
          { account_id: listrikId, debit: 380000, credit: 0 },
          { account_id: kasId, debit: 0, credit: 380000 },
        ],
      },
      // 10. Settlement of partial debt to CV Kopi Gayo
      {
        header: { tx_date: "2026-10-07", description: "Pembayaran cicilan utang dagang ke CV Kopi Gayo", source: "manual" },
        lines: [
          { account_id: utangId, debit: 500000, credit: 0 },
          { account_id: kasId, debit: 0, credit: 500000 },
        ],
      },
      // 11. Customer partial receivable payment from PT Maju Bersama
      {
        header: { tx_date: "2026-10-08", description: "Penerimaan transfer pembayaran termin 1 PT Maju Bersama", source: "manual" },
        lines: [
          { account_id: bankId, debit: 1500000, credit: 0 },
          { account_id: piutangId, debit: 0, credit: 1500000 },
        ],
      },
      // 12. Weekend daily sales cash
      {
        header: { tx_date: "2026-10-09", description: "Penjualan menu kopi dan camilan weekend", source: "text" },
        lines: [
          { account_id: kasId, debit: 2150000, credit: 0 },
          { account_id: revId, debit: 0, credit: 2150000 },
        ],
      },
      // 13. Packaging supplies expense
      {
        header: { tx_date: "2026-10-10", description: "Pembelian cup sablon dan sedotan take-away", source: "manual" },
        lines: [
          { account_id: hppId, debit: 320000, credit: 0 },
          { account_id: kasId, debit: 0, credit: 320000 },
        ],
      },
      // 14. Additional purchase on credit from CV Kopi Gayo
      {
        header: { tx_date: "2026-10-11", description: "Pengadaan biji kopi Arabika Gayo kredit", source: "ocr" },
        lines: [
          { account_id: hppId, debit: 1800000, credit: 0 },
          { account_id: utangId, debit: 0, credit: 1800000, party_id: SEED_IDS.OWNER_A_SUPPLIER_1, due_date: "2026-11-15" },
        ],
      },
      // 15. Promotion & Social Media Ads
      {
        header: { tx_date: "2026-10-12", description: "Biaya promosi media sosial dan endorse lokal", source: "manual" },
        lines: [
          { account_id: promoId, debit: 250000, credit: 0 },
          { account_id: kasId, debit: 0, credit: 250000 },
        ],
      },
      // 16. Second catering order on credit from PT Maju Bersama
      {
        header: { tx_date: "2026-10-13", description: "Penyediaan coffee booth training PT Maju Bersama", source: "text" },
        lines: [
          { account_id: piutangId, debit: 1800000, credit: 0, party_id: SEED_IDS.OWNER_A_CUSTOMER_1, due_date: "2026-10-28" },
          { account_id: revId, debit: 0, credit: 1800000 },
        ],
      },
      // 17. Settlement to UD Susu Segar Jaya
      {
        header: { tx_date: "2026-10-14", description: "Pelunasan tagihan susu kental manis UD Susu Segar Jaya", source: "manual" },
        lines: [
          { account_id: utangId, debit: 750000, credit: 0 },
          { account_id: kasId, debit: 0, credit: 750000 },
        ],
      },
      // 18. Monthly rent payment
      {
        header: { tx_date: "2026-10-15", description: "Pembayaran sewa tempat usaha bulan Oktober", source: "manual" },
        lines: [
          { account_id: sewaId, debit: 2000000, credit: 0 },
          { account_id: bankId, debit: 0, credit: 2000000 },
        ],
      },
      // 19. Mid-month staff salary
      {
        header: { tx_date: "2026-10-15", description: "Pembayaran gaji barista dan staf warkop", source: "manual" },
        lines: [
          { account_id: gajiId, debit: 2500000, credit: 0 },
          { account_id: bankId, debit: 0, credit: 2500000 },
        ],
      },
      // 20. Daily sales closing
      {
        header: { tx_date: "2026-10-16", description: "Pendapatan harian tunai penutup periode", source: "text" },
        lines: [
          { account_id: kasId, debit: 1450000, credit: 0 },
          { account_id: revId, debit: 0, credit: 1450000 },
        ],
      },
    ];

    for (const j of journalEntries) {
      await tx`
        SELECT fn_post_journal(
          ${SEED_IDS.OWNER_A_ID}::uuid,
          ${tx.json(j.header)},
          ${tx.json(j.lines)}
        );
      `;
    }

    // ~10 Knowledge base items for Owner A
    await tx`
      INSERT INTO knowledge_base (owner_id, category, title, content)
      VALUES 
        (${SEED_IDS.OWNER_A_ID}, 'faq', 'Jam Buka Operasional', 'Warkop Nusantara buka setiap hari Senin - Minggu pukul 08:00 - 22:00 WIB.'),
        (${SEED_IDS.OWNER_A_ID}, 'produk', 'Menu Kopi Andalan', 'Kopi Tubruk Robusta Rp 10.000, Kopi Susu Gula Aren Rp 18.000, Manual Brew V60 Rp 22.000.'),
        (${SEED_IDS.OWNER_A_ID}, 'produk', 'Menu Makanan & Camilan', 'Pisang Goreng Keju Rp 15.000, Roti Bakar Coklat Rp 14.000, Indomie Rebus Telur Rp 12.000.'),
        (${SEED_IDS.OWNER_A_ID}, 'kebijakan', 'Kebijakan Reservasi Meja', 'Reservasi area VIP minimal 4 orang, deposit 50% melalui transfer bank maksimal H-1.'),
        (${SEED_IDS.OWNER_A_ID}, 'faq', 'Metode Pembayaran Tersedia', 'Kami menerima pembayaran Tunai, QRIS (GoPay, OVO, ShopeePay, BCA), dan Transfer Bank.'),
        (${SEED_IDS.OWNER_A_ID}, 'operasional', 'Layanan Katering & Event', 'Menyediakan coffee booth dan snack box untuk kebutuhan rapat atau acara kantor.'),
        (${SEED_IDS.OWNER_A_ID}, 'operasional', 'Fasilitas WiFi & Stopkontak', 'Tersedia koneksi WiFi berkecepatan 50 Mbps dan colokan listrik di setiap meja untuk WFC.'),
        (${SEED_IDS.OWNER_A_ID}, 'operasional', 'Lokasi & Petunjuk Arah', 'Jl. Tebet Raya No. 45, Jakarta Selatan. 300 meter dari Stasiun KRL Tebet.'),
        (${SEED_IDS.OWNER_A_ID}, 'produk', 'Biji Kopi Kemasan (Beans)', 'Tersedia Roasted Beans Robusta Dampit 250g Rp 45.000 dan Arabika Gayo 200g Rp 65.000.'),
        (${SEED_IDS.OWNER_A_ID}, 'faq', 'Kontak WhatsApp & Telepon', 'Hubungi WhatsApp resmi kami di 0812-3456-7890 untuk konfirmasi pesanan cepat.');
    `;

    // 2 Bookings for Owner A
    const [schedA] = await tx<{ id: string }[]>`
      INSERT INTO schedules (owner_id, google_event_id, title, start_at, end_at, status, source)
      VALUES (
        ${SEED_IDS.OWNER_A_ID},
        'g-cal-event-warkop-001',
        'Reservasi Meja VIP Area Belakang',
        now() + interval '2 days',
        now() + interval '2 days 3 hours',
        'confirmed',
        'booking'
      )
      RETURNING id;
    `;

    await tx`
      INSERT INTO bookings (
        owner_id, schedule_id, customer_name, customer_phone, service_name, requested_start_at, requested_end_at, status, notes
      )
      VALUES 
        (
          ${SEED_IDS.OWNER_A_ID}, ${schedA.id}, 'Doni Pratama', '6281299990001', 'Meja VIP 4 Orang',
          now() + interval '2 days', now() + interval '2 days 3 hours', 'approved', 'Acara ulang tahun'
        ),
        (
          ${SEED_IDS.OWNER_A_ID}, ${schedA.id}, 'Rina Astuti', '6281299990002', 'Meja VIP 6 Orang',
          now() + interval '3 days', now() + interval '3 days 2 hours', 'approved', 'Diskusi komunitas kopi'
        );
    `;

    // 7 Days of Token Usage for Owner A
    const features: ("chat" | "ocr" | "report")[] = ["chat", "ocr", "report"];
    for (let day = 6; day >= 0; day--) {
      const dayDate = new Date(Date.now() - day * 86400000);
      const feature = features[day % features.length];
      const model = day % 2 === 0 ? "gemini-1.5-flash" : "gemini-1.5-pro";
      const inputTokens = 1000 + day * 150;
      const outputTokens = 400 + day * 80;

      await tx`
        INSERT INTO token_usage_logs (
          owner_id, request_id, model, feature, input_tokens, output_tokens, status, created_at
        )
        VALUES (
          ${SEED_IDS.OWNER_A_ID},
          ${`seed-req-warkop-day-${day}`},
          ${model},
          ${feature},
          ${inputTokens},
          ${outputTokens},
          'ok',
          ${dayDate}
        );
      `;
    }

    // 3. Seed Owner B (Free tier, Toko Kelontong, second tenant for isolation)
    await tx`
      INSERT INTO users (id, google_sub, email, role, status)
      VALUES (${SEED_IDS.OWNER_B_USER}, 'owner-b-sub-002', 'siti@tokoberkahjaya.id', 'owner', 'active');
    `;

    await tx`
      INSERT INTO owners (id, user_id, business_name, business_type, timezone, status)
      VALUES (${SEED_IDS.OWNER_B_ID}, ${SEED_IDS.OWNER_B_USER}, 'Toko Berkah Jaya', 'toko', 'Asia/Jakarta', 'active');
    `;

    await tx`
      INSERT INTO channel_connections (owner_id, channel, external_account_id, status, session_ref, credentials_enc)
      VALUES 
        (${SEED_IDS.OWNER_B_ID}, 'whatsapp', '6289876543210', 'connected', 'session_wa_berkah_002', decode('1234567890abcdef1234567890abcdef', 'hex')),
        (${SEED_IDS.OWNER_B_ID}, 'telegram', '987654321', 'connected', 'session_tg_berkah_002', decode('abcdef1234567890abcdef1234567890', 'hex'));
    `;

    await tx`
      INSERT INTO bot_configs (
        owner_id, 
        assistant_bot_name, 
        assistant_persona_prompt,
        admin_bot_name,
        admin_persona_prompt,
        persona_prompt, 
        selected_model_id,
        customer_access_mode,
        auto_reply_enabled, 
        business_hours
      )
      VALUES (
        ${SEED_IDS.OWNER_B_ID},
        'Asisten Toko Berkah',
        'Kamu adalah asisten internal pemilik Toko Berkah Jaya.',
        'Admin Toko Berkah',
        'Kamu adalah asisten Toko Berkah Jaya yang siap membantu pelanggan mengecek ketersediaan sembako.',
        'Kamu adalah asisten Toko Berkah Jaya yang siap membantu pengecekan ketersediaan dan harga sembako.',
        'gemini-1.5-flash',
        'open',
        true,
        '{"monday": {"open": "07:00", "close": "21:00"}}'::jsonb
      );
    `;

    await tx`
      INSERT INTO subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
      VALUES (${SEED_IDS.OWNER_B_ID}, ${gratisPlan.id}, 'active', now(), now() + interval '365 days');
    `;

    // Look up default accounts for Owner B (toko)
    const accountsB = await tx<{ id: string; code: string; type: string }[]>`
      SELECT id, code, type FROM accounts WHERE owner_id = ${SEED_IDS.OWNER_B_ID};
    `;
    const accMapB = new Map(accountsB.map((a) => [a.code, a.id]));
    const kasBId = accMapB.get("1101")!;
    const modalBId = accMapB.get("3101")!;
    const revBId = accMapB.get("4101")!;

    // Post a few journals for Owner B
    await tx`
      SELECT fn_post_journal(
        ${SEED_IDS.OWNER_B_ID}::uuid,
        ${tx.json({ tx_date: "2026-10-10", description: "Setoran modal toko kelontong", source: "manual" })},
        ${tx.json([
          { account_id: kasBId, debit: 3000000, credit: 0 },
          { account_id: modalBId, debit: 0, credit: 3000000 },
        ])}
      );
    `;

    await tx`
      SELECT fn_post_journal(
        ${SEED_IDS.OWNER_B_ID}::uuid,
        ${tx.json({ tx_date: "2026-10-11", description: "Penjualan sembako beras dan minyak", source: "text" })},
        ${tx.json([
          { account_id: kasBId, debit: 450000, credit: 0 },
          { account_id: revBId, debit: 0, credit: 450000 },
        ])}
      );
    `;

    // 2 KB items for Owner B
    await tx`
      INSERT INTO knowledge_base (owner_id, category, title, content)
      VALUES 
        (${SEED_IDS.OWNER_B_ID}, 'produk', 'Harga Beras Ramos 5kg', 'Beras Ramos Super 5kg harga Rp 72.000 per sak ready stock.'),
        (${SEED_IDS.OWNER_B_ID}, 'produk', 'Minyak Goreng 2L', 'Minyak Goreng Sania 2 Liter Rp 34.000 per pouch.');
    `;

    // 4. Seed Owner C (Free tier, Jasa, with EXHAUSTED quota for TC-21)
    await tx`
      INSERT INTO users (id, google_sub, email, role, status)
      VALUES (${SEED_IDS.OWNER_C_USER}, 'owner-c-sub-003', 'agus@bengkelcepat.id', 'owner', 'active');
    `;

    await tx`
      INSERT INTO owners (id, user_id, business_name, business_type, timezone, status)
      VALUES (${SEED_IDS.OWNER_C_ID}, ${SEED_IDS.OWNER_C_USER}, 'Bengkel Cepat Abadi', 'jasa', 'Asia/Jakarta', 'active');
    `;

    await tx`
      INSERT INTO subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
      VALUES (${SEED_IDS.OWNER_C_ID}, ${gratisPlan.id}, 'active', now(), now() + interval '365 days');
    `;

    // Seed exhausted quota counters for Owner C:
    // Gratis plan limits: daily = 10,000. Setting tokens_used >= limit exhausts the quota.
    const jktFmtC = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
    const todayKey = jktFmtC.format(new Date());
    const monthKey = todayKey.slice(0, 7);

    await tx`
      INSERT INTO quota_counters (owner_id, period_type, period_key, tokens_used)
      VALUES 
        (${SEED_IDS.OWNER_C_ID}, 'day', ${todayKey}, 15000),
        (${SEED_IDS.OWNER_C_ID}, 'month', ${monthKey}, 1050000);
    `;
  });

  console.log(">> [Meseid Seed] ✔ Successfully seeded demo data.");
}

if (import.meta.main) {
  runSeed()
    .then(async () => {
      await adminSql.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(">> [Meseid Seed] ❌ Seeding failed:", err);
      await adminSql.end();
      process.exit(1);
    });
}
