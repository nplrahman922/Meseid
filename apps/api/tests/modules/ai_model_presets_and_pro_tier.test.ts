import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../src/index";
import { adminSql } from "../../src/db/client";
import { signSession } from "../../src/lib/session";
import { chatService } from "../../src/modules/chat/chat.service";
import { PresetResolver } from "../../src/modules/chat/pipeline/preset-resolver";
import { ContextLoader } from "../../src/modules/chat/pipeline/context-loader";

describe("E2E Test Suite: AI Model Presets, Pro Tier, Multimodal (Vision/Audio/Web), & Persona/KB Compliance", () => {
  let ownerToken: string;
  let ownerId: string;
  let userId: string;
  let gratisPlanId: string;
  let proPlanId: string;

  const TEST_ID = Date.now().toString().slice(-6);
  const TEST_EMAIL = `test_runner_${TEST_ID}@meseid-test.internal`;
  const TEST_BOT_PHONE = `628999888${TEST_ID}`;
  const TEST_OWNER_PHONE = `628111222${TEST_ID}`;

  beforeAll(async () => {
    const plans = await adminSql<{ id: string; name: string }[]>`
      SELECT id, name FROM plans WHERE name IN ('gratis', 'pro');
    `;
    gratisPlanId = plans.find((p) => p.name === "gratis")!.id;
    proPlanId = plans.find((p) => p.name === "pro")!.id;

    // 1. Buat user dummy khusus pengujian (terisolasi 100%)
    const [user] = await adminSql`
      INSERT INTO users (email, google_sub, role, status)
      VALUES (${TEST_EMAIL}, ${'sub_' + TEST_ID}, 'owner', 'active')
      RETURNING id, email, role;
    `;
    userId = user.id;

    // 2. Buat owner dummy
    const [owner] = await adminSql`
      INSERT INTO owners (user_id, business_name, business_type, status, phone)
      VALUES (${userId}::uuid, 'Toko EnBee Test Dummy', 'toko', 'active', ${TEST_OWNER_PHONE})
      RETURNING id;
    `;
    ownerId = owner.id;

    ownerToken = signSession({
      userId: user.id,
      ownerId: owner.id,
      role: "owner",
      email: user.email,
    });

    // 3. Buat channel_connection dummy untuk bot testing
    await adminSql`
      INSERT INTO channel_connections (owner_id, channel, external_account_id, status, session_ref)
      VALUES (${ownerId}::uuid, 'whatsapp', ${TEST_BOT_PHONE}, 'connected', ${'session_test_' + TEST_ID});
    `;

    // 4. Buat subscription awal (gratis)
    await adminSql`
      INSERT INTO subscriptions (owner_id, plan_id, status, current_period_end)
      VALUES (${ownerId}::uuid, ${gratisPlanId}::uuid, 'active', now() + interval '30 days');
    `;

    // 5. Buat bot_configs dummy
    await adminSql`
      INSERT INTO bot_configs (
        owner_id, selected_model_id, assistant_bot_name, admin_bot_name,
        assistant_persona_prompt, admin_persona_prompt
      )
      VALUES (
        ${ownerId}::uuid, 'nvidia/nemotron-3.5-lightning-free', 'Asisten EnBee', 'Admin Toko EnBee',
        'Kamu asisten pencatat kas internal. Panggil Bos.',
        'Kamu admin customer service resmi toko. Panggil Kakak.'
      );
    `;
  });

  afterAll(async () => {
    // Bersihkan user dummy (otomatis cascade delete owners, bot_configs, subscriptions, channel_connections)
    if (userId) {
      await adminSql`DELETE FROM users WHERE id = ${userId}::uuid;`;
    }
  });

  it("1. Katalog Presets: Menampilkan tepat 4 model teruji dari database dengan status aksesibilitas riil", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${ownerToken}` },
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.models.length).toBe(4);

    const codes = json.models.map((m: any) => m.preset_code);
    expect(codes).toContain("nemotron-free");
    expect(codes).toContain("gemini-flash-pro");
    expect(codes).toContain("gpt4o-precision-pro");
    expect(codes).toContain("sonar-web-pro");

    // Akun Free: hanya nemotron yang accessible
    const freeModel = json.models.find((m: any) => m.preset_code === "nemotron-free");
    expect(freeModel.is_accessible).toBe(true);

    const proModel = json.models.find((m: any) => m.preset_code === "gemini-flash-pro");
    expect(proModel.is_accessible).toBe(false);
  });

  it("2. Otorisasi Tier Free: Menolak pemilihan model Pro dengan HTTP 403 Forbidden", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          selected_model_id: "gemini-flash-pro",
        }),
      })
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error).toBe("TIER_INSUFFICIENT");
  });

  it("3. Otorisasi Tier Pro: Setelah upgrade, dapat memilih ketiga model Pro dan tetap bisa memilih model Free", async () => {
    // 1. Upgrade owner ke Pro
    await adminSql`
      UPDATE subscriptions
      SET plan_id = ${proPlanId}::uuid,
          status = 'active',
          current_period_end = now() + interval '30 days'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    // 2. Pilih Gemini 2.5 Flash -> Berhasil
    const res1 = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ selected_model_id: "gemini-flash-pro" }),
      })
    );
    expect(res1.status).toBe(200);

    // 3. Pilih GPT-4o Omni -> Berhasil
    const res2 = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ selected_model_id: "gpt4o-precision-pro" }),
      })
    );
    expect(res2.status).toBe(200);

    // 4. Pilih Sonar Web Search -> Berhasil
    const res3 = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ selected_model_id: "sonar-web-pro" }),
      })
    );
    expect(res3.status).toBe(200);

    // 5. Akun Pro tetap bisa memilih Nemotron Free -> Berhasil
    const res4 = await app.handle(
      new Request("http://localhost/api/owner/personalisasi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ selected_model_id: "nemotron-free" }),
      })
    );
    expect(res4.status).toBe(200);
  });

  it("4. Parameter Presets Database: Runtime resolver mengambil parameter racikan riil", async () => {
    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'google/gemini-2.5-flash'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const preset = await PresetResolver.resolveRuntimePreset(ownerId);
    expect(preset.model_id).toBe("google/gemini-2.5-flash");
    expect(preset.temperature).toBe(0.20);
    expect(preset.max_tokens).toBe(4000);
    expect(preset.confidence_threshold).toBe(0.85);
    expect(preset.supports_vision).toBe(true);
    expect(preset.supports_audio).toBe(true);
    expect(preset.supports_web_search).toBe(true);
  });

  it("5. Kepatuhan Personalisasi & Knowledge Base: Konteks asisten (internal) vs admin toko (eksternal)", async () => {
    const ownerResolution = {
      owner_id: ownerId,
      user_id: userId,
      business_name: "Toko EnBee Test Dummy",
      business_type: "toko",
    };

    // 1. Asisten Toko (Owner/Internal)
    const assistantContext = await ContextLoader.loadChatContext(ownerResolution, true);
    expect(assistantContext.botName).toBe("Asisten EnBee");
    expect(assistantContext.customPersonaPrompt).toContain("pencatat kas internal");

    // 2. Admin Toko (Pelanggan Umum)
    const adminContext = await ContextLoader.loadChatContext(ownerResolution, false);
    expect(adminContext.botName).toBe("Admin Toko EnBee");
    expect(adminContext.customPersonaPrompt).toContain("customer service resmi");
  });

  it("6. Keamanan OCR: Kiriman foto oleh pelanggan (admin) diblokir dari pembukuan kas", async () => {
    const payload = {
      channel: "whatsapp" as const,
      bot_id: TEST_BOT_PHONE,
      external_message_id: "test_customer_photo_" + Date.now(),
      sender_id: "628999999999", // Nomor pelanggan luar
      sender_name: "Pelanggan Umum",
      chat_id: "628999999999@s.whatsapp.net",
      chat_type: "private",
      message_type: "photo",
      text: "",
      attachments: [
        {
          file_id: "photo_test_1",
          file_type: "photo",
          mime_type: "image/jpeg",
          data_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
      ],
      timestamp: Math.floor(Date.now() / 1000),
    };

    const res = await chatService.processInboundMessage(payload);
    expect(res.status).toBe("success");
    expect(res.reply_text).toContain("Terima kasih sudah mengirimkan gambar");
    expect(res.reply_text).toContain("admin toko");
  });

  it("7. Voice Note: Membaca dan memahami pesan suara untuk asisten", async () => {
    // Aktifkan bot Pro Gemini Flash yang mendukung audio
    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'google/gemini-2.5-flash'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const sampleRate = 8000;
    const buffer = Buffer.alloc(44 + sampleRate);
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + sampleRate, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate, 28);
    buffer.writeUInt16LE(1, 32);
    buffer.writeUInt16LE(8, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(sampleRate, 40);
    buffer.fill(128, 44);

    const audioBase64 = buffer.toString("base64");

    const payload = {
      channel: "whatsapp" as const,
      bot_id: TEST_BOT_PHONE,
      external_message_id: "test_vn_" + Date.now(),
      sender_id: TEST_OWNER_PHONE, // Nomor owner terdaftar
      sender_name: "EnBee Owner",
      chat_id: `${TEST_OWNER_PHONE}@s.whatsapp.net`,
      chat_type: "private",
      message_type: "audio",
      text: "",
      attachments: [
        {
          file_id: "audio_test_1",
          file_type: "audio",
          mime_type: "audio/wav",
          data_base64: audioBase64,
        },
      ],
      timestamp: Math.floor(Date.now() / 1000),
    };

    const res = await chatService.processInboundMessage(payload);
    expect(res.status).toBe("success");
    expect(res.reply_text).toBeTruthy();
    expect(res.reply_text.length).toBeGreaterThan(5);
  }, 30000);

  it("8. Vision OCR untuk Asisten: Membaca foto nota dan memproses pembukuan", async () => {
    // 1x1 pixel PNG
    const dummyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    const payload = {
      channel: "whatsapp" as const,
      bot_id: TEST_BOT_PHONE,
      external_message_id: "test_assistant_ocr_" + Date.now(),
      sender_id: TEST_OWNER_PHONE, // Nomor owner terdaftar
      sender_name: "EnBee Owner",
      chat_id: `${TEST_OWNER_PHONE}@s.whatsapp.net`,
      chat_type: "private",
      message_type: "photo",
      text: "Catat pengeluaran dari nota ini",
      attachments: [
        {
          file_id: "photo_asisten_1",
          file_type: "photo",
          mime_type: "image/png",
          data_base64: dummyImageBase64,
        },
      ],
      timestamp: Math.floor(Date.now() / 1000),
    };

    const res = await chatService.processInboundMessage(payload);
    expect(res.status).toBe("success");
    expect(res.reply_text).toBeTruthy();
  }, 30000);

  it("9. Web Search Grounding: Model Sonar Web Search mengeksekusi pencarian web langsung", async () => {
    await adminSql`
      UPDATE bot_configs
      SET selected_model_id = 'perplexity/sonar'
      WHERE owner_id = ${ownerId}::uuid;
    `;

    const payload = {
      channel: "whatsapp" as const,
      bot_id: TEST_BOT_PHONE,
      external_message_id: "test_web_search_" + Date.now(),
      sender_id: TEST_OWNER_PHONE, // Nomor owner terdaftar
      sender_name: "EnBee Owner",
      chat_id: `${TEST_OWNER_PHONE}@s.whatsapp.net`,
      chat_type: "private",
      message_type: "text",
      text: "Berapa kurs 1 USD ke IDR hari ini?",
      timestamp: Math.floor(Date.now() / 1000),
    };

    const res = await chatService.processInboundMessage(payload);
    expect(res.status).toBe("success");
    expect(res.reply_text).toBeTruthy();
    expect(
      res.reply_text.toLowerCase().includes("rp") ||
      res.reply_text.toLowerCase().includes("idr") ||
      res.reply_text.toLowerCase().includes("rupiah")
    ).toBe(true);
  }, 30000);
});
