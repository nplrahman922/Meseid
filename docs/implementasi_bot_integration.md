# Rencana & Dokumen Spesifikasi: Integrasi Real WhatsApp QR Baileys, Custom Telegram Bot, & Verifikasi Nomor Personal Owner

Dokumen ini merupakan panduan implementasi teknis untuk menghubungkan antarmuka Onboarding Step 2 (`apps/web`) dengan Bot Gateway (`apps/bot`) dan Backend API (`apps/api`), berdasarkan keputusan arsitektur terbaru dari pemilik proyek:

1. **WhatsApp:** Menggunakan pemindaian langsung (Real Live Scan via Baileys QR), bukan sesi dummy atau sesi lama.
2. **Telegram:** Menggunakan Custom Token Bot pribadi dari @BotFather (Bring Your Own Bot).
3. **Indikator Status Bot:** Tampil eksplisit dalam **Bahasa Inggris** (`Connecting...` / `Processing...`, `Connected` / `Connected successfully`, `Failed to connect` / `Connection failed`).
4. **Nomor Ponsel untuk OTP:** Nomor ponsel yang dimasukkan pada form OTP adalah **Nomor Pribadi Owner** (disimpan di `owners.phone`), bukan nomor bot WhatsApp Baileys. Fungsinya adalah sebagai pengenal identitas saat Owner mengirim pesan ke bot toko (agar bot mengaktifkan Persona Asisten/Pembukuan, bukan Persona Admin Customer). OTP dikirimkan oleh Bot Toko ke Nomor Pribadi Owner tersebut.

---

## 1. Arsitektur Komponen

```text
+-----------------------------------------------------------------------------------+
| Browser (Web User / Owner)                                                        |
|   Step 2: Connect Store Bots & Personal Identity                                  |
|   1. Scan QR Baileys    -> Hubungkan Bot WhatsApp Toko                            |
|   2. Input BotFather    -> Hubungkan Bot Telegram Toko                            |
|   3. Input Personal HP  -> Terima OTP dari Bot Toko, simpan ke owners.phone       |
+-----------------------------------------------------------------------------------+
                                   | (Port 80 Nginx)
                                   v
+-----------------------------------------------------------------------------------+
| apps/api (Bun + Elysia)                                                           |
|   - GET  /api/bot/whatsapp/status (forward ke bot:3001)                           |
|   - POST /api/bot/whatsapp/reset  (purge old creds & start fresh QR)              |
|   - POST /api/bot/telegram/verify (validasi token getMe & registrasi bot)         |
|   - POST /api/bot/otp/send        (kirim kode OTP ke nomor pribadi owner)         |
|   - POST /api/bot/otp/verify      (verifikasi kode & ikat ke owners.phone)        |
+-----------------------------------------------------------------------------------+
                                   | (HTTP internal port 3001)
                                   v
+-----------------------------------------------------------------------------------+
| apps/bot (Node.js + Hono + Baileys + grammY)                                     |
|   - WhatsApp: resetSession(), registerSession(), getQr()                          |
|   - Telegram: verifyToken(), registerBot()                                        |
|   - Outbound: /send (kirim pesan OTP via bot toko yang aktif)                     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Rincian Perubahan File

### Tahap 1: Bot Gateway (`apps/bot`)
1. `apps/bot/src/whatsapp/bot.manager.ts`:
   * Tambahkan metode `resetSession(sessionId: string): Promise<WASocket>`.
   * Bersihkan data autentikasi lama dari Redis (`redis.del(...)`) dan disk.
   * Daftarkan ulang sesi baru yang memicu event QR nyata dari server WhatsApp.
2. `apps/bot/src/telegram/bot.manager.ts`:
   * Tambahkan metode `verifyToken(token: string): Promise<TelegramVerifyResult>`.
   * Hubungi `https://api.telegram.org/bot<token>/getMe` untuk mengecek validitas token, username, dan bot id.
3. `apps/bot/src/index.ts`:
   * Route `POST /whatsapp/session/reset/:sessionId`: Mereset sesi dan memulai siklus QR baru.
   * Route `POST /telegram/verify`: Memvalidasi token Telegram dari BotFather dan mendaftarkan bot ke pool aktif.

### Tahap 2: Backend API (`apps/api`)
1. `apps/api/src/modules/bot/bot.gateway.client.ts`:
   * Client HTTP dengan autentikasi `x-internal-secret` ke `http://bot:3001`.
   * Fungsi: `fetchWhatsappStatus()`, `resetWhatsappSession()`, `verifyTelegramToken()`.
2. `apps/api/src/modules/bot/bot.controller.ts` & `apps/api/src/routes/bot.ts`:
   * Route `GET /api/bot/whatsapp/status`.
   * Route `POST /api/bot/whatsapp/reset`.
   * Route `POST /api/bot/telegram/verify`.
   * Pertahankan route `/api/bot/otp/send` dan `/api/bot/otp/verify` yang mengikat nomor pribadi ke `owners.phone`.

### Tahap 3: Frontend Web (`apps/web`)
1. `apps/web/src/panels/users/overview/overviewService.ts`:
   * Implementasikan fungsi pemanggilan API ke endpoint bot baru.
2. `apps/web/src/panels/users/overview/components/Step2WhatsappModal.svelte`:
   * Integrasi pustaka `qrcode` (sudah terpasang).
   * Polling status live ke `/api/bot/whatsapp/status` setiap 2 detik.
   * Status dalam Bahasa Inggris:
     * `Connecting to WhatsApp...` (loading/spinner)
     * `Ready for scan` (render live QR Code dari Baileys)
     * `Connected successfully` (tampilkan nomor bot toko yang tersambung)
     * `Connection failed` (error/reconnect)
   * Tombol "Reset & Scan New QR" untuk mereset sesi lama dan memicu QR baru.
3. `apps/web/src/panels/users/overview/components/Step2TelegramModal.svelte`:
   * Input token Telegram dari BotFather.
   * Tombol "Verify Token" dengan status Bahasa Inggris:
     * `Processing verification...`
     * `Connected successfully as @{username}`
     * `Connection failed: Invalid token or bot unreachable`
4. `apps/web/src/panels/users/overview/components/Step2ConnectBots.svelte`:
   * Status kartu bot dalam Bahasa Inggris: `Connected` / `Not connected`.
   * Keterangan jelas pada sub-step nomor ponsel:
     *"Owner Personal Phone: This number will be recognized by your store bot as the Owner (unlocking the Business Assistant persona and financial ledger). Customers will be greeted by the Store Admin persona."*

---

## 3. Rencana Pengujian (Test Plan)
1. **Unit Test Bot Gateway:**
   * Test reset sesi WhatsApp Baileys.
   * Test verifikasi token Telegram (valid vs invalid format).
2. **Integration Test Backend API:**
   * Test GET status WhatsApp & POST verify Telegram token.
   * Test pengiriman dan verifikasi OTP nomor personal owner.
3. **Frontend Diagnostics:**
   * Menjalankan `svelte-check` untuk memastikan 0 error dan 0 warning.
4. **End-to-End Verification:**
   * Rebuild kontainer Docker (`docker compose up -d --build`).
   * Verifikasi respon HTTP di `http://localhost/api/bot/...`.
