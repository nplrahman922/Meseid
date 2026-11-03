# 📐 Rencana Implementasi: Koneksi AI (Model Gratis) & Chat Inbound End-to-End

Dokumen ini merupakan hasil investigasi menyeluruh dan cetak biru teknis yang telah **DISETUJUI DENGAN REVISI** untuk menghubungkan pesan chat dari bot (Telegram prioritas utama, WhatsApp setelahnya) ke Backend API (`apps/api`), memprosesnya menggunakan model AI gratis via Vercel AI Gateway, mendeteksi persona (Owner vs Pembeli), mencatat transaksi & ringkasan percakapan (`chat_logs`), serta mengembalikan balasan secara end-to-end tanpa error.

---

## 1. 🔍 Ringkasan Temuan (Kondisi Saat Ini)

Berdasarkan penelusuran menyeluruh pada repositori:

1. **Mekanisme Pembacaan AI Gratis:**
   * **Path File:** [`apps/api/src/adapters/ai/ai.adapter.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/adapters/ai/ai.adapter.ts)
   * **Fungsi Utama:** `aiAdapter.getFreeModels(forceRefresh?: boolean)` dan `aiAdapter.listModels(forceRefresh?: boolean)`.
   * **Cara Kerja:** Mengakses endpoint Vercel AI Gateway `GET https://ai-gateway.vercel.sh/v1/models` menggunakan `AI_PROVIDER_API_KEY`. Fungsi ini memfilter 477 model berdasarkan kriteria harga nol (`pricing.input === '0' && pricing.output === '0'`), label `tags.includes('free')`, atau akhiran ID `-free`.
   * **Hasil Pengujian Aktual:** Ditemukan 8 model gratis aktif, dengan `nvidia/nemotron-3.5-lightning-free` (1M context tokens, $0 cost) telah diuji dan berhasil membalas prompt UMKM dalam bahasa Indonesia dengan latensi ~5 detik.
   * **Model Pro (Qwen):** Sesuai revisi poin 10, `AI_DEFAULT_MODEL_PRO` dialihkan ke model Qwen (misalnya `alibaba/qwen3.5-flash`).

2. **Pemanggilan Provider AI Saat Ini:**
   * **Abstraksi:** Kelas `AiAdapter` ([`apps/api/src/adapters/ai/ai.adapter.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/adapters/ai/ai.adapter.ts)).
   * **Metode:** `aiAdapter.chat(options: AiChatOptions)` yang memanggil `POST https://ai-gateway.vercel.sh/v1/chat/completions` (OpenAI-compatible protocol).
   * **Variabel Lingkungan Terkait:** `AI_PROVIDER_API_KEY`, `AI_GATEWAY_URL`, `AI_DEFAULT_MODEL_FREE`, `AI_DEFAULT_MODEL_PRO` yang dimuat via [`apps/api/src/config/env.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/config/env.ts).

3. **Status Alur `POST /api/chat/inbound`:**
   * **Sisi Bot:** [`apps/bot/src/telegram/models/api.client.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/bot/src/telegram/models/api.client.ts) dan [`apps/bot/src/whatsapp/models/api.client.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/bot/src/whatsapp/models/api.client.ts) siap mengirim payload `InboundMessagePayload` dengan header `x-internal-secret`. Timeout HTTP client bot akan disesuaikan menjadi 25 detik agar tidak memutus koneksi sebelum API selesai melakukan 2 percobaan AI (2 x 8 detik = 16 detik).
   * **Sisi API:** Folder [`apps/api/src/modules/chat`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/chat) masih kosong, dan rute `/api/chat/inbound` belum terdaftar di [`apps/api/src/routes/index.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/routes/index.ts).

4. **Cara Bot Membaca Kredensial:**
   * **Telegram:** Membaca `process.env.TELEGRAM_BOT_TOKEN` di [`apps/bot/src/telegram/index.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/bot/src/telegram/index.ts).
   * **WhatsApp:** Membaca `process.env.WA_DEFAULT_SESSION_ID` dan menyimpannya di Redis in-memory (`wa:session:<sessionId>`) atau file disk fallback di [`apps/bot/src/whatsapp/bot.manager.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/bot/src/whatsapp/bot.manager.ts).

5. **Kondisi Data Seed & Relasi Tenant Dummy:**
   * Di [`apps/api/src/db/seed.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/db/seed.ts), sudah ada data dummy:
     * User: `budi@warkopnusantara.id`
     * Owner: `Warkop Nusantara` (ID: `00000000-0000-0000-0000-000000000011`)
     * Bot Configs: `assistant_persona_prompt` (Asisten Bisnis) dan `admin_persona_prompt` (Admin Toko).

---

## 2. ⚡ Gap (Hal yang Kurang untuk Mencapai Tujuan)

1. **Endpoint `POST /api/chat/inbound` di `apps/api`:** Controller dan routing Elysia untuk menerima pesan dari bot.
2. **Idempotency & Siklus Status Pesan:** Status pesan di `inbound_messages` (`processing`, `done`, `failed`, `duplicate`). Pesan dengan status `failed` diizinkan untuk diproses ulang jika dikirim kembali.
3. **Penyelarasan Timeout:** Timeout HTTP client bot (saat ini 15 detik) harus ditingkatkan menjadi 25 detik agar mampu menampung total durasi AI maksimal 20 detik (2 percobaan x 8 detik + overhead).
4. **Tenant Resolver & Dev Flag Auto-Bind:** Logika pemetaan bot ke owner di `chat.service.ts` dengan flag `DEV_AUTO_BIND_OWNER=true` dan identifikasi owner manual via `DEV_OWNER_TELEGRAM_ID`.
5. **Penanganan RLS Sebelum `owner_id` Diketahui:** Penggunaan koneksi sistem (system context) untuk operasi `inbound_messages` dan `channel_connections` sebelum konteks RLS tenant diaktifkan.
6. **Orkestrasi AI Satu Panggilan (Single Turn):** Prompt gabungan yang menghasilkan balasan, deteksi intent, sentimen, dan ekstraksi transaksi dalam satu JSON terstruktur yang divalidasi skema.
7. **Pencegahan Transaksi Persona Pembeli:** Menjamin intent transaksi diabaikan secara tegas di kode jika pengirim adalah pembeli/customer.
8. **Privasi Logging:** Memastikan teks isi pesan tidak dicatat di log aplikasi manapun.

---

## 3. 🏗️ Rancangan Teknis & Ketetapan Revisi

### A. Alur Pemrosesan Pesan Masuk (`Inbound Flow`)

```
[Pengguna Kirim Chat] 
       │
       ▼
[apps/bot] (Telegram Gateway)
       │  Normalisasi ke InboundMessagePayload
       │  POST http://api:3000/api/chat/inbound (Header: x-internal-secret, Timeout: 25s)
       ▼
[apps/api] /api/chat/inbound
       │
       ├─► 1. Autentikasi Internal (cek x-internal-secret)
       │
       ├─► 2. Cek Idempotency di tabel `inbound_messages` (System Context)
       │      ├─ Status 'done' atau 'processing' -> Return { status: 'ignored' }
       │      └─ Baru / 'failed' -> Set status 'processing'
       │
       ├─► 3. Resolve Tenant (System Context)
       │      ├─ Cari mapping di `channel_connections`
       │      └─ Jika belum ada & DEV_AUTO_BIND_OWNER=true -> Bind otomatis ke Owner A
       │
       ├─► 4. Deteksi Persona
       │      ├─ Sender == Owner (atau sender_id == DEV_OWNER_TELEGRAM_ID) -> ASISTEN BISNIS
       │      └─ Sender != Owner -> ADMIN TOKO (Pembeli)
       │
       ├─► 5. Panggil AI dengan Resilient Model Selector (Maksimal 2 Percobaan x 8 Detik)
       │      ├─ Ambil daftar model gratis dinamis via `getFreeModels()`
       │      ├─ Pemicu Fallback: HTTP 400, 404, 429, 5xx, atau Timeout 8 detik
       │      └─ Satu panggilan mengembalikan JSON: { reply, intent, sentiment, summary, transaction }
       │
       ├─► 6. Validasi Skema Output AI
       │      ├─ Valid -> Lanjut ke penyimpanan
       │      └─ Gagal Validasi -> Ambil teks biasa tanpa mencatat transaksi
       │
       ├─► 7. Filter Persona Pembeli:
       │      └─ Jika Persona == ADMIN TOKO (Pembeli) -> ABAIKAN objek transaction (jangan insert ke transactions)
       │
       ├─► 8. Database Transaction (dalam RLS Context: `SET LOCAL app.current_owner_id = '<owner_id>'`)
       │      ├─ Simpan data keuangan ke `transactions` (hanya untuk Owner)
       │      ├─ Simpan ringkasan ke `chat_logs` (summary, intent, sentiment)
       │      └─ Update status `inbound_messages` -> 'done' (atau 'failed' jika gagal)
       │
       └─► 9. Kembalikan Response JSON ke Bot:
              { status: 'success', reply_text: '...', action_buttons: [...] }
       │
       ▼
[apps/bot] Render tampilan & Kirim ke User
```

### B. Penjelasan RLS Sebelum `owner_id` Diketahui (Revisi Poin 6)

Sesuai aturan keamanan multi-tenant Meseid:
1. **Tahap 1 (Pra-Owner):** Tabel `inbound_messages` dan `channel_connections` diakses menggunakan **System Context** (`adminSql` atau pool aplikasi sistem) yang memiliki hak akses global untuk verifikasi webhook idempotency dan lookup pemetaan tenant (`GRANT ... TO meseid_system_ctx`). Pada tahap ini, RLS tenant belum aktif karena identitas `owner_id` belum diketahui.
2. **Tahap 2 (Pasca-Owner):** Setelah `owner_id` berhasil dipetakan, seluruh operasi data bisnis (`transactions`, `chat_logs`, `wallets`, `categories`) **WAJIB** dijalankan di dalam blok transaksi PostgreSQL dengan perintah RLS:
   ```sql
   SET LOCAL app.current_owner_id = '<owner_id>';
   ```
   Ini memastikan data transaksi dan catatan kas terisolasi secara kriptografis dan logika database per tenant.

### C. Strategi Pemilihan Model AI Gratis & Fallback Berantai (Revisi Poin 1, 3, 10)

1. **Daftar Model Dinamis:**
   * Model default utama: `AI_DEFAULT_MODEL_FREE` (default: `nvidia/nemotron-3.5-lightning-free`).
   * Model pro: `AI_DEFAULT_MODEL_PRO=alibaba/qwen3.5-flash` (Qwen).
   * Model fallback cadangan: Diambil secara dinamis dari `aiAdapter.getFreeModels()`. Jika env `AI_FALLBACK_MODELS_FREE` diisi, nilai env tersebut dipakai sebagai override prioritas.
2. **Pemicu Fallback Lengkap:**
   * HTTP 400 (Bad Request / Model Format Error)
   * HTTP 404 (Model Not Found / Deprecated)
   * HTTP 429 (Rate Limit Exceeded)
   * HTTP 5xx (Internal Server Error / Gateway Timeout)
   * Network Abort / Timeout (lewat batas 8 detik)
3. **Batas Waktu (SLA):**
   * Maksimal **2 percobaan x 8 detik** per percobaan = maksimal 16 detik total pemanggilan AI.
   * HTTP client bot timeout disetel ke **25 detik** untuk memberi ruang proses DB dan transmisi jaringan.
4. **Pesan Kegagalan yang Akurat:**
   * Jika seluruh model AI gagal, bot membalas:
     > *"Mohon maaf, sistem AI kami sedang mengalami gangguan antrean. Catatan transaksi Anda BELUM tersimpan. Silakan kirim ulang pesan beberapa saat lagi."*
   * Bot **TIDAK PERNAH** mengklaim data tersimpan jika belum committed di database.

### D. Skema JSON AI Satu Panggilan (Revisi Poin 8, 9)

AI dipanggil dengan instruksi sistem agar mengembalikan satu objek JSON terstruktur:
```json
{
  "reply": "Teks balasan ramah untuk pengguna...",
  "intent": "expense" | "income" | "inquiry" | "general",
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "Ringkasan interaksi singkat tanpa detail rahasia...",
  "transaction": {
    "type": "expense" | "income",
    "amount": 25000,
    "category": "Operasional",
    "notes": "Beli bensin motor"
  } | null
}
```
* **Validasi Skema:** Divalidasi secara ketat di kode. Jika JSON tidak valid, field `reply` diambil dari raw text, dan `transaction` diabaikan (tidak dicatat ke database).
* **Persona Pembeli:** Jika persona terdeteksi sebagai `buyer` (Admin Toko), field `transaction` **langsung dibuang/diabaikan** di level kode (Revisi Poin 7).

### E. Privasi Logging & Pengabaian File (Revisi Poin 11)

* Semua logger di bot dan API dilarang mencatat `text` pesan secara mentah (*raw message content*). Log hanya mencatat metadata: `external_message_id`, `sender_id`, `channel`, `latency_ms`, dan `status`.
* Folder `logs/` dan `apps/*/logs/` dipastikan masuk ke [`.gitignore`](file:///d:/Project-Sync-Enbee/meseid/.gitignore).

---

## 4. 📝 Daftar Perubahan per File

| No | File | Tipe Aksi | Alasan & Rincian Perubahan |
| :--- | :--- | :--- | :--- |
| 1 | `apps/api/src/adapters/ai/ai.adapter.ts` | **Edit** | Update `chatWithFallback`: timeout 8s x 2 percobaan, deteksi dinamis dari `getFreeModels()`, fallback pada 400, 404, 429, 5xx, timeout. |
| 2 | `apps/api/src/modules/chat/chat.schema.ts` | **Baru** | Skema validasi output JSON AI dan payload inbound request. |
| 3 | `apps/api/src/modules/chat/chat.service.ts` | **Baru** | Logika chat: idempotency (`processing/done/failed`), auto-bind `DEV_AUTO_BIND_OWNER=true`, `DEV_OWNER_TELEGRAM_ID`, RLS context, pencegahan transaksi pembeli, dan pencatatan `chat_logs`. |
| 4 | `apps/api/src/modules/chat/chat.controller.ts` | **Baru** | Controller Elysia: validasi header `x-internal-secret` dan delegasi ke `chat.service.ts`. |
| 5 | `apps/api/src/routes/chat.ts` | **Baru** | Definisi route `POST /api/chat/inbound`. |
| 6 | `apps/api/src/routes/index.ts` | **Edit** | Mendaftarkan route `/chat` ke `apiRoutes`. |
| 7 | `apps/bot/src/telegram/models/api.client.ts` | **Edit** | Naikkan timeout HTTP client ke 25 detik; bersihkan logging agar tidak mencatat raw message text. |
| 8 | `apps/bot/src/whatsapp/models/api.client.ts` | **Edit** | Naikkan timeout HTTP client ke 25 detik; bersihkan logging agar tidak mencatat raw message text. |
| 9 | `apps/api/src/db/migrations/014_ingestion_chat.sql` | **Edit** | Perbarui check constraint `inbound_messages.status` menjadi `('processing', 'done', 'failed', 'duplicate')` sesuai siklus hidup pesan. |
| 10 | `.env.example` & `.env` | **Edit** | Tambah `DEV_AUTO_BIND_OWNER=true`, `DEV_OWNER_TELEGRAM_ID=`, `AI_DEFAULT_MODEL_PRO=alibaba/qwen3.5-flash`. |
| 11 | `.gitignore` | **Edit** | Pastikan `logs/` dan `apps/*/logs/` diabaikan sepenuhnya. |
| 12 | `apps/api/tests/adapters/ai_extraction.test.ts` | **Baru** | Pengujian unit ekstraksi AI terhadap 10 kalimat transaksi bahasa Indonesia (Langkah 1). |
| 13 | `apps/api/tests/modules/chat.test.ts` | **Baru** | Pengujian unit end-to-end chat inbound (idempotency, persona, RLS, chat_logs). |

---

## 5. ⚙️ Env dan Konfigurasi Baru

Diperbarui di [`.env.example`](file:///d:/Project-Sync-Enbee/meseid/.env.example) dan [`.env`](file:///d:/Project-Sync-Enbee/meseid/.env):

```bash
# ---------------------------------------------------------------------
# AI PROVIDER (Vercel AI Gateway - Multi-Model & Free Tier)
# ---------------------------------------------------------------------
AI_PROVIDER_API_KEY=
AI_GATEWAY_URL=https://ai-gateway.vercel.sh/v1
AI_DEFAULT_MODEL_FREE=nvidia/nemotron-3.5-lightning-free
AI_FALLBACK_MODELS_FREE=minimax/minimax-m3.1-flash,poolside/laguna-s-2.1-free,reflection/beam-free
AI_DEFAULT_MODEL_PRO=alibaba/qwen3.5-flash

# ---------------------------------------------------------------------
# DEVELOPMENT & AUTO-BINDING FLAGS
# ---------------------------------------------------------------------
# Set true agar saat dev bot Telegram/WA otomatis di-link ke Owner A jika belum ada mapping
DEV_AUTO_BIND_OWNER=true
# ID Telegram Owner (angka dari @userinfobot) agar akun developer dikenali sebagai Owner
DEV_OWNER_TELEGRAM_ID=
```

---

## 6. 🧪 Langkah Uji Manual

### Uji 1: Verifikasi 10 Kalimat Transaksi (Langkah 1)
Jalankan test suite ekstraksi:
```bash
bun test tests/adapters/ai_extraction.test.ts
```
Memverifikasi 10 kalimat transaksi UMKM:
1. `"Beli bensin 25rb buat nganter pesanan"` -> expense, 25000
2. `"Beli telur 2kg 56.000 di agen"` -> expense, 56000
3. `"Bayar tagihan listrik toko 150rb"` -> expense, 150000
4. `"Terima pembayaran katering 1.500.000 via transfer"` -> income, 1500000
5. `"Beli kantong plastik 3 pack 45rb"` -> expense, 45000
6. `"Penjualan kopi hari ini laku 320.000"` -> income, 320000
7. `"Beli galon air 3 biji 54rb"` -> expense, 54000
8. `"Bayar uang kebersihan dan iuran pasar 10rb"` -> expense, 10000
9. `"Pelanggan bayar utang kemarin 75.000"` -> income, 75000
10. `"Beli gas elpiji 3kg 22rb"` -> expense, 22000

### Uji 2: Pesan Telegram Persona Owner
1. Jalankan `apps/api` dan `apps/bot`.
2. Kirim dari akun Telegram Owner (`DEV_OWNER_TELEGRAM_ID`): `"Beli bensin motor 25rb"`.
3. Balasan bot: Konfirmasi pencatatan pengeluaran dengan tombol/format rapi.
4. Data tercatat di tabel `transactions` dan `chat_logs` milik Owner A.

### Uji 3: Pesan Telegram Persona Pembeli
1. Kirim dari akun Telegram lain (atau hapus `DEV_OWNER_TELEGRAM_ID`): `"Halo kak, apakah warkop buka hari ini? Ada kopi tubruk?"`.
2. Balasan bot: Ramah sebagai Admin Toko.
3. Tabel `transactions` **TIDAK BERTAMBAH**. Tabel `chat_logs` tercatat dengan `intent: inquiry`.

### Uji 4: Idempotency & Retry Failed
1. Kirim pesan yang sama dengan `external_message_id` berulang.
2. Respons kedua menghasilkan status `ignored` tanpa duplikasi transaksi.
3. Jika status awal sengaja diset `failed`, pengiriman ulang akan sukses diproses ulang.

---

## 7. ⏱️ Urutan Pengerjaan Bertahap (Fase 2)

* **Langkah 1:** Resilient AI Model Selector di `ai.adapter.ts` (timeout 8s x 2 retry, dynamic fallback, 400/404/429/5xx handling) + test ekstraksi 10 kalimat transaksi.
* **Langkah 2:** Update skema status `inbound_messages` di migrasi `014_ingestion_chat.sql`, update timeout bot client ke 25s, dan update `.gitignore`.
* **Langkah 3:** Implementasi `chat.schema.ts` dan `chat.service.ts` (idempotency, RLS handling, persona filter, `DEV_AUTO_BIND_OWNER`, `DEV_OWNER_TELEGRAM_ID`).
* **Langkah 4:** Implementasi `chat.controller.ts` dan route `apps/api/src/routes/chat.ts`, registrasi ke `routes/index.ts`, dan test suite `chat.test.ts`.
* **Langkah 5:** Pengujian end-to-end integrasi bot Telegram, pengujian manual langsung ke bot, dan verifikasi database.
