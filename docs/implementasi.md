# 📐 Rencana Implementasi: End-to-End Onboarding, Verifikasi OTP Bot, Identitas Owner, Personalisasi, & Knowledge Base

Dokumen ini merupakan cetak biru teknis dan arsitektur modular terkini untuk menghubungkan alur antarmuka **Onboarding Wizard** (`apps/web`) dengan **Backend API** (`apps/api`) serta **Bot Gateway** (`apps/bot`). 

Struktur kode diatur dengan prinsip **pemisahan tanggung jawab (Separation of Concerns)**, di mana modul `owner` dipecah menjadi sub-folder spesifik (`profile`, `onboarding`, `personalisasi`, dan `kb`) agar logika kode tidak menumpuk dalam satu file.

---

## 1. 🔍 Status Terkini & Analisis Gap

1. **Frontend (`apps/web/src/panels/users/overview`):**
   * **Step 1A (`Step1Name.svelte`):** Input nama panggilan pemilik (`userName`).
   * **Step 1B (`Step1Business.svelte`):** Input nama bisnis (`businessName`), pilihan kategori industri (`businessType`), serta input drawer khusus untuk opsi *"Other"* (`customCategory`, `businessDescription`) tanpa emoji.
   * **Step 2 (`Step2ConnectBots.svelte`):** Koneksi bot toko (WhatsApp/Telegram), input nomor ponsel pemilik dengan Country Code Dropdown, dan verifikasi 6-digit OTP berurutan dalam 3 sub-layar.
   * **Step 3 (`Step3PersonalizeForm.svelte`):** Konfigurasi dual-persona bot (nama bot, gaya bicara, dan aturan khusus).
   * **Step 4 (`Step4KnowledgeBase.svelte`):** Kartu FAQ, produk, dan operasional bisnis.
   * **Step 5 (`Step5Ready.svelte`):** Layar finalisasi persiapan bot.
   * *Status:* Seluruh form frontend sudah selesai dan terverifikasi bersih (`0 errors, 0 warnings`), namun data masih tersimpan di `localStorage` dan belum terkirim ke backend.

2. **Backend Database (`PostgreSQL 16` RLS):**
   * *Gap Skema Database:*
     1. Tabel `owners` belum memiliki kolom `phone` untuk mencatat nomor HP pribadi pemilik toko.
     2. Tabel `owners` belum memiliki kolom penampung spesialisasi bisnis (`custom_business_type` & `business_description`).
     3. Tabel `owners` belum memiliki penanda status penyelesaian onboarding (`onboarding_completed`).
     4. Tabel `knowledge_base` belum memiliki kolom `is_internal` (boolean) untuk membedakan info rahasia/asisten vs info publik customer.
     5. Tabel `knowledge_base` masih memiliki constraint kaku `CHECK (category IN ('faq', 'produk', 'operasional', 'kebijakan'))`.

3. **Backend API (`apps/api`):**
   * Modul `owner` saat ini hanya berisi `owner.model.ts` dan `owner.controller.ts` monolitik untuk profil dasar dan penghapusan akun (UU PDP).
   * Perlu refaktor arsitektur menjadi sub-modul terpisah (`profile`, `onboarding`, `personalisasi`, `kb`).
   * Belum ada modul OTP bot untuk pengiriman dan verifikasi OTP.

4. **Bot Gateway (`apps/bot`):**
   * Belum memiliki antarmuka HTTP internal untuk diperintahkan oleh Backend API mengirimkan pesan OTP keluar (*outbound*) ke nomor WhatsApp atau chat Telegram pemilik.

---

## 2. 🏗️ Dekomposisi Arsitektur Modul Owner (`apps/api/src/modules/owner/`)

Agar fungsi tidak menumpuk dalam satu file besar, modul `owner` dipecah menjadi 4 sub-domain independen:

```text
apps/api/src/modules/owner/
├── index.ts                         # Barrel export seluruh controller & model
├── profile/                         # 1. Identitas Inti & Profil Bisnis
│   ├── profile.model.ts             # Query tabel owners, update profil, UU PDP erasure
│   └── profile.controller.ts        # GET/PUT /api/owner/profile, DELETE /api/owner/account
├── onboarding/                      # 2. Orkestrator Onboarding Wizard
│   ├── onboarding.model.ts          # Transaksi atomik multi-tabel (owners + bot_configs + kb)
│   └── onboarding.controller.ts     # POST /api/owner/onboarding, GET /api/owner/onboarding-status
├── personalisasi/                   # 3. Dual-Persona & Konfigurasi Bot
│   ├── personalisasi.model.ts       # Query bot_configs, compiler prompt persona dari chips
│   └── personalisasi.controller.ts  # GET/PUT /api/owner/personalisasi
└── kb/                              # 4. Knowledge Base (Basis Pengetahuan)
    ├── kb.model.ts                  # Batch insert onboarding, CRUD artikel KB, search
    └── kb.controller.ts             # GET/POST/PUT/DELETE /api/owner/kb
```

### Tanggung Jawab Masing-Masing Sub-Folder:
1. **`profile/`:** Mengelola nama usaha (`business_name`), bidang usaha (`business_type`), zona waktu (`timezone`), nomor telepon (`phone`), dan kepatuhan UU PDP penghapusan data tenant (`delete_owner_data`).
2. **`onboarding/`:** Berfungsi sebagai *orchestrator*. Mengambil data lengkap dari Step 1 s/d 5, lalu memanggil fungsi-fungsi dari `profile.model.ts`, `personalisasi.model.ts`, dan `kb.model.ts` dalam **satu transaksi database ber-RLS**.
3. **`personalisasi/`:** Mengelola tabel `bot_configs`. Bertanggung jawab mengompilasi array chips gaya bicara (`speakingStyles`) dan aturan toko (`customRules`) menjadi kalimat instruksi sistem AI (`admin_persona_prompt` & `assistant_persona_prompt`), serta menyuntikkan detail kustom dari opsi *"Other"*.
4. **`kb/`:** Mengelola tabel `knowledge_base`. Menyediakan fungsi penyimpanan massal saat onboarding, pencarian artikel berdasarkan relevansi pertanyaan pelanggan, serta filtering flag `is_internal`.

---

## 3. ✅ Bagian yang Sudah Yakin Pasti (Confirmed / Facts)

1. **Model Keamanan & Isolasi RLS Database:**
   * Setiap query yang melibatkan data tenant (`owners`, `bot_configs`, `knowledge_base`) **wajib** dijalankan di dalam blok transaksi PostgreSQL dengan perintah context switcher `withOwnerContext(ownerId, userId, tx)` (`SET LOCAL app.owner_id = '...'`).
   * Operasi sistem sebelum tenant terikat (seperti pengecekan webhook bot atau lookup OTP) dijalankan via `withSystemContext(tx)`.

2. **Skema Identitas Toko di Tabel `owners`:**
   * Kolom wajib: `business_name text NOT NULL`, `business_type text NOT NULL CHECK (business_type IN ('kuliner', 'toko', 'jasa', 'lainnya'))`.
   * Pilihan *"Other"* di UI dipetakan ke `'lainnya'` di database agar mematuhi constraint PostgreSQL yang sudah ada.

3. **Dual-Persona Bot:**
   * Database memisahkan dua persona: `assistant_persona_prompt` (Asisten Bisnis internal) dan `admin_persona_prompt` (Admin Toko ramah).
   * Adapter AI (`apps/api/src/adapters/ai/ai.adapter.ts`) membutuhkan `businessName` dan `businessType` di prompt sistemnya agar balasan chat dan pencatatan kas relevan.

4. **Deteksi Pesan Masuk Owner (`chat.service.ts`):**
   * Backend mengenali siapa pemilik toko dengan mencocokkan nomor WhatsApp pengirim dengan nomor owner yang terdaftar (`normSender === normOwner`).

5. **Tabel Verifikasi OTP (`channel_link_codes`):**
   * Database sudah memiliki tabel `channel_link_codes` (`owner_id`, `channel`, `target_external_id`, `code_hash`, `expires_at`, `used_at`) yang siap dipakai untuk menyimpan dan mencocokkan kode OTP.

---

## 4. 🧩 Bagian yang Masih Diasumsikan (Assumptions)

1. **Endpoint Atomik Komposit (`POST /api/owner/onboarding`):**
   * *Asumsi:* Seluruh data onboarding dari Step 1 sampai Step 5 dikirim sekaligus dalam satu payload JSON. Jika terjadi error di tengah proses (misalnya koneksi putus saat insert KB), database akan melakukan *rollback* penuh sehingga tidak menyisakan data setengah jadi.

2. **Kompilasi Chips ke Prompt Kalimat:**
   * *Asumsi:* Array chips dari frontend akan dirangkai oleh `personalisasi.model.ts` menjadi teks instruksi sistem utuh:
     ```text
     Gaya Bicara: Ramah, Informatif. Aturan Khusus: Jangan tanya dua kali, gunakan bahasa santun.
     ```
     Jika opsi *"Other"* dipilih, nilai `customCategory` dan `businessDescription` otomatis ditambahkan di awal prompt sebagai identitas spesialisasi bisnis.

3. **Penyimpanan Nomor Pribadi Pemilik:**
   * *Asumsi:* Nomor telepon pemilik disimpan pada kolom baru `phone` di tabel `owners` dalam format E.164 internasional (contoh: `+6281234567890`).

4. **Privasi Knowledge Base (`is_internal`):**
   * *Asumsi:* Kolom baru `is_internal` (boolean, default `false`) pada tabel `knowledge_base` mencerminkan toggle `onlyAssistant` dari frontend. Jika `true`, artikel tersebut hanya boleh dibaca oleh persona Asisten Bisnis (Owner) dan tidak akan dibocorkan ke Pelanggan Toko.

5. **Pengiriman Outbound OTP dari Bot:**
   * *Asumsi:* Backend API memanggil endpoint internal Bot Gateway (`POST http://bot:3001/internal/send-message`) menggunakan shared secret `INTERNAL_API_SECRET`.

---

## 5. ❓ Pertanyaan Konfirmasi untuk User (Open Questions)

Sebelum kita mulai menulis kode backend dan bot, mohon konfirmasi untuk 3 poin penting berikut:

1. **Pertanyaan 1 (Alur OTP Telegram vs WhatsApp):**
   * Jika user menghubungkan **Telegram Bot** di Step 2 (memasukkan Bot Token dari @BotFather):
     * Apakah pengiriman OTP dilakukan via **WhatsApp** (ke nomor HP yang diinput), ATAU user diarahkan mengklik link Telegram deep-link (contoh: `t.me/NamaBot?start=OTP_CODE`) untuk memverifikasi akun Telegram pribadinya?
     * *Rekomendasi:* Jika nomor HP diinput, paling andal jika bot WhatsApp yang mengirim pesan OTP. Jika hanya bot Telegram yang terhubung, bot meminta user mengirim chat `/start` ke bot Telegram tersebut.
2. **Pertanyaan 2 (Penghapusan Constraint Kategori Knowledge Base):**
   * Di tabel `knowledge_base`, apakah Anda setuju jika constraint kaku `CHECK (category IN ('faq', 'produk', 'operasional', 'kebijakan'))` **dihapus** dan diubah menjadi `category text NOT NULL` bebas (dengan batas 50 karakter), agar user bebas menulis kategori unik usahanya?
3. **Pertanyaan 3 (Mode Bot Gateway Saat Development):**
   * Saat pengujian lokal di laptop Anda saat ini:
     * Apakah bot Telegram (`TELEGRAM_MODE=polling`) yang aktif digunakan untuk pengujian, atau bot WhatsApp (`WA_SESSION_PATH`), atau keduanya?

---

## 6. 📁 Rincian File & Penempatan Path (Files to Create & Modify)

### A. Database Migrations (`apps/api/src/db/migrations/`)
| Path File | Aksi | Deskripsi Perubahan |
| :--- | :--- | :--- |
| [`apps/api/src/db/migrations/018_onboarding_enhancements.sql`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/db/migrations/018_onboarding_enhancements.sql) | **Baru** | 1. Tambah kolom `phone` di tabel `owners`.<br>2. Tambah kolom `custom_business_type` & `business_description` di `owners`.<br>3. Tambah kolom `onboarding_completed` (boolean) di `owners`.<br>4. Tambah kolom `is_internal` (boolean) di `knowledge_base`.<br>5. Lepas check constraint kaku `knowledge_base.category`. |

---

### B. Backend API - Modul Owner Terdekomposisi (`apps/api/src/modules/owner/`)
| Path File | Aksi | Deskripsi Perubahan |
| :--- | :--- | :--- |
| [`apps/api/src/modules/owner/profile/profile.model.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/profile/profile.model.ts) | **Baru** | Query data profil, update identitas bisnis & nomor telepon, eksekusi UU PDP erasure (`delete_owner_data`). |
| [`apps/api/src/modules/owner/profile/profile.controller.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/profile/profile.controller.ts) | **Baru** | Controller untuk `GET /api/owner/profile`, `PUT /api/owner/profile`, `DELETE /api/owner/account`. |
| [`apps/api/src/modules/owner/personalisasi/personalisasi.model.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/personalisasi/personalisasi.model.ts) | **Baru** | Query `bot_configs`, compiler penyusun prompt persona dari chips gaya bicara & aturan toko. |
| [`apps/api/src/modules/owner/personalisasi/personalisasi.controller.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/personalisasi/personalisasi.controller.ts) | **Baru** | Controller untuk `GET /api/owner/personalisasi` dan `PUT /api/owner/personalisasi`. |
| [`apps/api/src/modules/owner/kb/kb.model.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/kb/kb.model.ts) | **Baru** | Batch insert artikel onboarding, CRUD knowledge base per tenant, dan fungsi pencarian relevansi. |
| [`apps/api/src/modules/owner/kb/kb.controller.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/kb/kb.controller.ts) | **Baru** | Controller untuk `GET/POST/PUT/DELETE /api/owner/kb`. |
| [`apps/api/src/modules/owner/onboarding/onboarding.model.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/onboarding/onboarding.model.ts) | **Baru** | Orkestrator transaksi atomik: mengeksekusi penyimpanan profil, channel connection, personalisasi, dan KB dalam 1 transaksi RLS. |
| [`apps/api/src/modules/owner/onboarding/onboarding.controller.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/onboarding/onboarding.controller.ts) | **Baru** | Controller untuk `POST /api/owner/onboarding` dan `GET /api/owner/onboarding-status`. |
| [`apps/api/src/modules/owner/index.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/index.ts) | **Edit** | Barrel export yang rapi mengekspos semua sub-modul di atas. |
| [`apps/api/src/modules/owner/owner.model.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/owner.model.ts) | **Hapus/Refaktor** | Dipecah dan dipindahkan ke masing-masing sub-folder agar tidak menumpuk. |
| [`apps/api/src/modules/owner/owner.controller.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/owner/owner.controller.ts) | **Hapus/Refaktor** | Dipecah dan dipindahkan ke masing-masing sub-folder agar tidak menumpuk. |

---

### C. Backend API - Modul Bot & OTP (`apps/api/src/modules/bot/`)
| Path File | Aksi | Deskripsi Perubahan |
| :--- | :--- | :--- |
| [`apps/api/src/modules/bot/bot.otp.service.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/bot/bot.otp.service.ts) | **Baru** | Logika OTP: generate 6-digit random code, hashing, pencatatan di `channel_link_codes`, pemicu pesan outbound ke bot, dan validasi expiration. |
| [`apps/api/src/modules/bot/bot.controller.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/modules/bot/bot.controller.ts) | **Baru** | Controller Elysia untuk `POST /api/bot/otp/send` dan `POST /api/bot/otp/verify`. |
| [`apps/api/src/routes/bot.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/routes/bot.ts) | **Baru** | Definisi route `/api/bot/otp/*`. |
| [`apps/api/src/routes/owner.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/routes/owner.ts) | **Edit** | Mendaftarkan sub-rute profil, onboarding, personalisasi, dan KB. |
| [`apps/api/src/routes/index.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/routes/index.ts) | **Edit** | Mendaftarkan `botRoutes` dan memperbarui `ownerRoutes`. |

---

### D. Bot Gateway Outbound Messenger (`apps/bot/src/`)
| Path File | Aksi | Deskripsi Perubahan |
| :--- | :--- | :--- |
| [`apps/bot/src/index.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/bot/src/index.ts) | **Edit** | Inisialisasi HTTP server internal (port 3001) untuk mendengarkan panggilan API dari backend Elysia. |
| [`apps/bot/src/outbound/outbound.controller.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/bot/src/outbound/outbound.controller.ts) | **Baru** | Menerima payload internal `{ channel, recipient, message }` dan mengirimkan chat secara langsung via Baileys (`sock.sendMessage`) atau grammY (`bot.api.sendMessage`). |

---

### E. Frontend Web (`apps/web/src/`)
| Path File | Aksi | Deskripsi Perubahan |
| :--- | :--- | :--- |
| [`apps/web/src/panels/users/overview/overviewService.ts`](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/overview/overviewService.ts) | **Edit** | Sambungkan `sendOtpCode()`, `verifyOtpCode()`, dan `submitOnboarding()` ke API backend menggunakan `fetch()`. |
| [`apps/web/src/panels/users/overview/components/Step2ConnectBots.svelte`](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/overview/components/Step2ConnectBots.svelte) | **Edit** | Ganti mock timer 400ms dengan pemanggilan nyata ke backend OTP service. |
| [`apps/web/src/panels/users/overview/components/Step5Ready.svelte`](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/overview/components/Step5Ready.svelte) | **Edit** | Eksekusi `submitOnboarding()` ke `POST /api/owner/onboarding` saat animasi robot selesai, baru navigasi ke `/dashboard`. |
| [`apps/web/src/panels/users/overview/OverviewRoot.svelte`](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/overview/OverviewRoot.svelte) | **Edit** | Cek status `onboarding_completed` dari backend saat `onMount()`. |

---

## 7. 🚀 Rencana Eksekusi Bertahap

```text
Tahap 1: Migrasi Database
   │  - Buat 018_onboarding_enhancements.sql (kolom phone, custom_type, is_internal, dll)
   │  - Jalankan runner migrasi bun run db:migrate
   ▼
Tahap 2: Refaktor Modul Owner (Sub-folder: profile, onboarding, personalisasi, kb)
   │  - Buat sub-folder kb/ (kb.model.ts & kb.controller.ts)
   │  - Buat sub-folder personalisasi/ (personalisasi.model.ts & controller)
   │  - Buat sub-folder profile/ (profile.model.ts & controller)
   │  - Buat sub-folder onboarding/ (onboarding.model.ts & controller)
   │  - Update barrel export index.ts & rute apps/api/src/routes/owner.ts
   ▼
Tahap 3: Modul OTP Bot & Outbound Messenger
   │  - Buat bot.otp.service.ts & bot.controller.ts di apps/api
   │  - Buat outbound.controller.ts di apps/bot (kirim pesan WhatsApp/Telegram riil)
   ▼
Tahap 4: Integrasi Frontend & Uji End-to-End
   │  - Sambungkan Step 2 ke endpoint OTP riil
   │  - Sambungkan Step 5 ke POST /api/owner/onboarding
   │  - Verifikasi seluruh data tersimpan rapi di tabel PostgreSQL
```

---
*Dokumen ini diperbarui untuk memastikan struktur kode tetap modular, bersih, dan mudah dirawat.*
