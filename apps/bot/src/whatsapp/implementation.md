# 📐 Rencana Implementasi: Jaringan Komunikasi Bot WhatsApp (Baileys Multi-Session per Tenant) & Backend API

Dokumen ini menjelaskan rancangan arsitektur, struktur folder MVC + Router, manajemen sesi multi-device, kontrak komunikasi antar-service, serta strategi ketahanan koneksi (**Multi-Session Socket Lifecycle & Auto-Reconnect**) untuk menghubungkan **Bot WhatsApp Baileys** (`apps/bot/src/whatsapp`) dengan **Backend API** (`apps/api`).

Rancangan ini mengadopsi standar arsitektur dan pola desain yang identik dengan modul Telegram (`apps/bot/src/telegram`) agar kode modular, mudah dirawat, konsisten, dan terisolasi dengan rapi.

---

## 1. 🎯 Keputusan Desain Utama

1. **Model Bot: Multi-Session per Tenant (Multi-Device WhatsApp)**
   - Setiap Owner UMKM menghubungkan nomor WhatsApp bisnisnya sendiri melalui sesi WhatsApp Web Multi-Device (QR Code atau Pairing Code).
   - Kredensial sesi disimpan secara in-memory di **Redis** (`useRedisAuthState` pada Docker Compose) untuk kecepatan maksimum (< 1ms) dan meniadakan I/O disk thrashing pada ribuan file kecil.
   - Sistem menyediakan **graceful fallback** otomatis ke folder lokal `${WA_SESSION_PATH}/session_<sessionId>` (`useMultiFileAuthState`) jika Redis dinonaktifkan atau offline.
   - Di lingkungan Docker, data Redis dipetakan ke volume persisten `redisdata:/data` (`meseid_redisdata`), sehingga sesi login WhatsApp tidak hilang saat database di-restart, dan bersih total saat `docker compose down -v`.
   - Layanan bot mengelola banyak koneksi socket WhatsApp secara dinamis melalui **`WhatsAppBotManager`**, serta mendukung sesi default lokal (`wa_default`) untuk keperluan testing developer.

2. **Koneksi WebSocket Persisten & Auto-Reconnect**
   - Berbeda dengan Telegram yang mendukung webhook stateless HTTP dari cloud Telegram, Baileys bekerja sebagai klien WhatsApp Web berbasis koneksi **WebSocket stateful**.
   - Sistem membedakan secara cerdas antara **pemutusan sementara** (`DisconnectReason.restartRequired`, `DisconnectReason.timedOut`, `DisconnectReason.connectionLost`) yang memicu auto-reconnect dengan backoff, dan **logout permanen** (`DisconnectReason.loggedOut`) yang membersihkan folder kredensial agar sesi baru dapat dipasangkan kembali.

3. **Independensi Kanal & Gateway Tipis (Thin Gateway)**
   - Bot WhatsApp bertindak murni sebagai gateway pengantar pesan (I/O layer) tanpa logika bisnis atau perhitungan akuntansi langsung di dalamnya.
   - Semua pesan masuk (`messages.upsert`) diekstraksi, dinormalisasi ke format kontrak `InboundMessagePayload`, dan diteruskan via HTTP POST ke backend API (`http://api:3000/api/chat/inbound`) dengan proteksi `x-internal-secret`.
   - Backend API memproses data menggunakan Gemini AI & aturan akuntansi Meseid, lalu mengembalikan teks balasan serta tombol aksi ke bot untuk dikirimkan kembali ke pengguna WhatsApp.

4. **Dukungan Format Pesan WhatsApp & Fallback Aksi**
   - Format teks disesuaikan dengan format native WhatsApp (*bold*, _italic_, ~strikethrough~, monospace).
   - Karena dukungan tombol interaktif (interactive buttons) di WhatsApp personal/multi-device bervariasi pada versi aplikasi pengguna, `WhatsAppView` menyediakan format menu aksi bernomor yang andal (`[1] Ya, Simpan`, `[2] Batalkan`) yang tetap kompatibel 100% di semua versi WhatsApp, dengan dukungan native interactive buttons sebagai opsi tambahan.

---

## 2. 🏗️ Diagram Arsitektur Komunikasi

```
[ WhatsApp Network / Cloud ]
             │
             │ WebSocket (Multi-Device Protocol)
             ▼
┌────────────────────────────────────────────────────────────────────────┐
│ apps/bot/src/whatsapp (Gateway Kanal Tipis Baileys)                    │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ WhatsAppBotManager                                           │     │
│   │ - Mengelola pool socket WASocket per tenant                  │     │
│   │ - MultiFileAuthState & session persistence (/data/wa-session)│     │
│   │ - Lifecycle event (connection.update, creds.update, upsert) │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│                                  ▼                                     │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ WhatsAppRouter (Message Dispatcher)                          │     │
│   │ - Filter self-message (fromMe) & broadcast/status            │     │
│   │ - Klasifikasi tipe pesan: Command / Text / Image / Button   │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│                                  ▼                                     │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Controllers (chat.controller.ts, command.controller.ts)      │     │
│   │ - Typing presence simulator ('composing')                    │     │
│   │ - Download foto/struk via downloadMediaMessage               │     │
│   └──────────────┬────────────────────────────────┬──────────────┘     │
│                  │                                │                    │
│                  ▼                                ▼                    │
│   ┌────────────────────────────┐    ┌──────────────────────────────┐   │
│   │ Views (whatsapp.view.ts)   │    │ Models (api.client.ts)       │   │
│   │ Formatter teks WhatsApp,   │    │ HTTP Client ke Backend API   │   │
│   │ menu nomor aksi, help/info │    │ (x-internal-secret, timeout) │   │
│   └────────────────────────────┘    └─────────────┬────────────────┘   │
└───────────────────────────────────────────────────┼────────────────────┘
                                                    │
                                                    │ HTTP POST (x-internal-secret)
                                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ apps/api (Backend Modular Monolith: http://api:3000)                   │
│  - Verifikasi header x-internal-secret                                 │
│  - resolve_channel_identity('whatsapp', phone_number)                  │
│  - Ingestion Idempotency (inbound_messages)                            │
│  - Gemini AI Accounting & OCR Parser                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 📂 Rencana Struktur Folder MVC + Router di `apps/bot/src/whatsapp`

```text
apps/bot/src/whatsapp/
├── controllers/
│   ├── chat.controller.ts       # Menangani chat masuk (teks transaksi, foto struk, respon tombol)
│   └── command.controller.ts    # Menangani perintah bot (/start, /help, /status, /menu)
├── models/
│   ├── api.client.ts            # Client HTTP ke backend API (x-internal-secret, timeout, retry)
│   └── types.ts                 # DTO & interface payload komunikasi WhatsApp <-> API
├── views/
│   └── whatsapp.view.ts         # Template pesan WhatsApp (*bold*, menu opsi, help, status)
├── router.ts                    # Dispatcher pesan masuk Baileys ke controller yang sesuai
├── bot.manager.ts               # WhatsAppBotManager: Lifecycle multi-session, QR, auto-reconnect
├── index.ts                     # Entrypoint modul WhatsApp (ekspor manager, fungsi kirim pesan)
└── implementation.md            # Dokumen arsitektur ini
```

Selain itu, ditambahkan modul logger terdedikasi di:
- `apps/bot/src/logs/modules/whatsapp.log.ts`: Pencatatan log terstruktur untuk status koneksi, QR code, pesan masuk, media, dan error WhatsApp.

---

## 4. 🔌 Kontrak Komunikasi Data

### A. Inbound (Pesan Masuk dari Pengguna WhatsApp ➡️ Backend API)
Ketika ada pesan masuk ke akun WhatsApp salah satu tenant, `chat.controller` membungkus data dan memanggil `api.client.ts`:

- **Target URL**: `http://api:3000/api/chat/inbound`
- **Header Keamanan**:
  ```http
  x-internal-secret: <INTERNAL_API_SECRET>
  Content-Type: application/json
  ```
- **Payload Request (Teks Transaksi)**:
  ```json
  {
    "channel": "whatsapp",
    "bot_id": "6281234567890",
    "external_message_id": "3EB0ABC123DEF456",
    "sender_id": "628111222333",
    "sender_name": "Pak Budi",
    "chat_id": "628111222333@s.whatsapp.net",
    "chat_type": "private",
    "message_type": "text",
    "text": "Beli telur 5 kg 135000",
    "timestamp": 1729388400
  }
  ```
- **Payload Request (Foto Struk/Nota Belanja)**:
  ```json
  {
    "channel": "whatsapp",
    "bot_id": "6281234567890",
    "external_message_id": "3EB0ABC999FFF111",
    "sender_id": "628111222333",
    "sender_name": "Pak Budi",
    "chat_id": "628111222333@s.whatsapp.net",
    "chat_type": "private",
    "message_type": "photo",
    "text": "Nota belanja pasar pagi tadi",
    "attachments": [
      {
        "file_id": "3EB0ABC999FFF111",
        "file_type": "photo",
        "mime_type": "image/jpeg"
      }
    ],
    "timestamp": 1729388405
  }
  ```
- **Response dari Backend API**:
  ```json
  {
    "status": "success",
    "reply_text": "Catatan Pengeluaran:\n• *Telur 5 kg*: Rp 135.000\n\nApakah data transaksi ini sudah benar?",
    "action_buttons": [
      { "label": "✅ Ya, Simpan", "callback_data": "confirm_trx_wa_01" },
      { "label": "❌ Batalkan", "callback_data": "cancel_trx_wa_01" }
    ]
  }
  ```

### B. Outbound (API ➡️ Bot WhatsApp untuk Kirim Notifikasi/Pengingat)
Ketika backend API memiliki pengingat jadwal, tagihan, atau laporan penutupan kas harian:

- **Target URL**: `POST http://bot:3001/send`
- **Header Keamanan**:
  ```http
  x-internal-secret: <INTERNAL_API_SECRET>
  Content-Type: application/json
  ```
- **Payload Request**:
  ```json
  {
    "channel": "whatsapp",
    "bot_id": "6281234567890",
    "recipient_id": "628111222333",
    "message": "Halo Pak Budi! Berikut ringkasan kas toko Anda hari ini...",
    "options": {
      "action_buttons": [
        { "label": "📊 Unduh PDF", "callback_data": "report_pdf_today" }
      ]
    }
  }
  ```
- `WhatsAppBotManager` mengambil instance socket yang sesuai (`bot_id` atau sesi aktif default), memformat nomor tujuan ke JID WhatsApp (`<nomor>@s.whatsapp.net`), lalu mengirimkan pesan via `sock.sendMessage`.

---

## 5. 🔄 Manajemen Sesi Baileys & Alur Autentikasi

### A. Lifecycle Koneksi
1. **Inisialisasi**:
   - `WhatsAppBotManager.registerSession(config)` memanggil `useMultiFileAuthState(sessionDir)`.
   - Membuat socket dengan konfigurasi Baileys modern (`makeWASocket`), mengaktifkan `keepAliveIntervalMs`, dan mematikan log bawaan pino yang bising agar diarahkan ke logger sistem Meseid.
2. **Penyajian QR Code & Status**:
   - Event `connection.update`:
     - Jika properti `qr` diterima: disimpan pada memori sesi dan dicatat di log. Disediakan endpoint HTTP `GET /whatsapp/qr/:sessionId` agar frontend/dashboard dapat menampilkan QR secara visual ke pengguna.
     - Jika properti `connection === 'open'`: nomor terautentikasi diekstraksi dari `sock.user.id`, status diubah menjadi `CONNECTED`, dan pool bot siap menerima/mengirim pesan.
     - Jika properti `connection === 'close'`: kode pemutusan diperiksa melalui `(lastDisconnect?.error as Boom)?.output?.statusCode`.
       - Jika `DisconnectReason.loggedOut` (401): sesi ditutup permanen, folder auth dibersihkan jika diminta, dan event `LOGGED_OUT` dicatat.
       - Jika alasan lain (jaringan putus, server restart): memicu penjadwalan auto-reconnect dengan jeda bertahap (exponential backoff 3s, 6s, 12s, maks 30s).

### B. Opsi Pairing Code (Alternatif Bebas Kamera/QR)
- Selain scan QR code melalui kamera, Baileys mendukung permintaan Pairing Code 8 digit (`sock.requestPairingCode(phoneNumber)`). Ini sangat memudahkan pengguna UMKM yang ingin menghubungkan bot WhatsApp langsung melalui nomor telepon tanpa perlu membuka kamera untuk scan layar.
- Dukungan endpoint: `POST /whatsapp/pairing-code` menerima `{ session_id, phone_number }` dan mengembalikan kode pairing berformat `ABCD-EFGH`.

---

## 6. 🛡️ Resilience, Fault Tolerance & Idempotensi

1. **Idempotensi Pesan Masuk**:
   - Setiap pesan masuk dari WhatsApp memiliki `msg.key.id` unik global. ID ini dikirimkan ke backend API sebagai `external_message_id`, sehingga tabel `inbound_messages` dengan unique constraint `(channel, external_message_id)` mencegah duplikasi pencatatan jika pesan diterima ulang saat reconnecting.
2. **Indikator Sedang Mengetik (Typing Presence)**:
   - Saat pesan diterima dan sedang diproses oleh backend/Gemini AI, bot mengirimkan presence update `sendPresenceUpdate('composing', remoteJid)` agar pengalaman pengguna responsif dan interaktif.
3. **Pemberitahuan Graceful Saat Backend Maintenance**:
   - Jika `http://api:3000` tidak dapat dihubungi atau mengalami timeout (15s), bot tidak akan crash, melainkan mengirimkan balasan pesan ramah: *"Mohon maaf, sistem asisten Meseid sedang dalam pemeliharaan sejenak. Pesan Anda telah dicatat."*
4. **Graceful Shutdown**:
   - Saat container atau server dimatikan (`SIGTERM`/`SIGINT`), fungsi `whatsAppBotManager.stopAll()` menutup seluruh koneksi WebSocket secara rapi untuk mencegah file kredensial JSON korup di disk.

---

## 7. 📋 Rencana Tahapan Implementasi (Next Steps)

Ketika rencana ini disetujui, langkah implementasi akan dilakukan secara bertahap tanpa auto-complete langsung:

- [ ] **Tahap 1**: Buat tipe data dan interface (`apps/bot/src/whatsapp/models/types.ts`).
- [ ] **Tahap 2**: Buat client HTTP API (`apps/bot/src/whatsapp/models/api.client.ts`).
- [ ] **Tahap 3**: Buat formatter pesan WhatsApp (`apps/bot/src/whatsapp/views/whatsapp.view.ts`).
- [ ] **Tahap 4**: Buat modul logger WhatsApp (`apps/bot/src/logs/modules/whatsapp.log.ts`) dan daftarkan di `apps/bot/src/logs/index.ts`.
- [ ] **Tahap 5**: Buat controller (`apps/bot/src/whatsapp/controllers/chat.controller.ts` & `command.controller.ts`).
- [ ] **Tahap 6**: Buat router pesan Baileys (`apps/bot/src/whatsapp/router.ts`).
- [ ] **Tahap 7**: Buat manager multi-session Baileys (`apps/bot/src/whatsapp/bot.manager.ts`).
- [ ] **Tahap 8**: Buat entrypoint modul (`apps/bot/src/whatsapp/index.ts`).
- [ ] **Tahap 9**: Hubungkan ke server utama `apps/bot/src/index.ts` (healthcheck, endpoint `/send`, dan graceful shutdown).
- [ ] **Tahap 10**: Validasi kompilasi TypeScript (`npm run build` di `apps/bot`) dan pengujian.
