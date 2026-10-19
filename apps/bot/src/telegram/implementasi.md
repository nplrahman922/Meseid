# 📐 Rencana Implementasi: Jaringan Komunikasi Bot Telegram (Multi-Bot per Tenant) & Backend API

Dokumen ini menjelaskan rancangan arsitektur, struktur folder MVC + Router, kontrak komunikasi antar-service, serta strategi dual-mode (**Local Polling** vs **Tailscale Webhook**) untuk menghubungkan **Bot Telegram** (`apps/bot/src/telegram`) dengan **Backend API** (`apps/api`).

---

## 1. 🎯 Keputusan Desain Utama

Berdasarkan diskusi dan kebutuhan:
1. **Model Bot: Multi-Bot per Tenant**
   - Setiap Owner UMKM memiliki bot Telegram-nya masing-masing yang didaftarkan melalui BotFather.
   - Token disimpan terenkripsi di tabel database `channel_connections.credentials_enc` (AES-256-GCM).
   - Layanan bot mengelola banyak bot secara dinamis melalui **`BotManager`**, serta tetap mendukung bot default lokal via `TELEGRAM_BOT_TOKEN` di `.env` untuk keperluan testing developer.
2. **Koneksi Dual-Mode (Lokal & Tailscale)**
   - **Lokal (Offline/Dev Laptop)**: Berjalan otomatis dalam mode **Long Polling** (`TELEGRAM_MODE=polling`). Tidak memerlukan IP publik, sertifikat SSL, atau tunneling.
   - **Server Tailscale (Remote/Production)**: Mendukung mode **Webhook** (`TELEGRAM_MODE=webhook`) yang memanfaatkan URL HTTPS publik/Tailscale Funnel (`https://<node>.ts.net/telegram/webhook/:botId`) dan diproses langsung oleh server Hono di port 3001.

---

## 2. 🏗️ Diagram Arsitektur Komunikasi

```
[ Telegram Cloud ]
   │
   ├─ (Local Dev)  ───► Long Polling ──────┐
   └─ (Tailscale)  ───► Webhook Callback ──┤
                                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│ apps/bot/src/telegram (Gateway Kanal Tipis)                            │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ BotManager (Mengelola instance bot per-tenant & pool bot)   │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│                                  ▼                                     │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Router (grammY Composer: Command / Message / Callback)       │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│                                  ▼                                     │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Controllers (chat.controller.ts, command.controller.ts)      │     │
│   └──────────────┬────────────────────────────────┬──────────────┘     │
│                  │                                │                    │
│                  ▼                                ▼                    │
│   ┌────────────────────────────┐    ┌──────────────────────────────┐   │
│   │ Views (telegram.view.ts)   │    │ Models (api.client.ts)       │   │
│   │ Formatter teks, keyboard   │    │ HTTP Client ke Backend API   │   │
│   └────────────────────────────┘    └─────────────┬────────────────┘   │
└───────────────────────────────────────────────────┼────────────────────┘
                                                    │
                                                    │ HTTP POST (x-internal-secret)
                                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ apps/api (Backend Modular Monolith: http://api:3000)                   │
│  - Verifikasi x-internal-secret                                        │
│  - resolve_channel_identity('telegram', bot_id)                        │
│  - Ingestion Idempotency (inbound_messages)                            │
│  - Accounting Rules & Gemini AI Engine                                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 📂 Struktur File MVC + Router di `apps/bot/src/telegram`

```text
apps/bot/src/telegram/
├── controllers/
│   ├── chat.controller.ts       # Menangani chat masuk (teks bebas, transaksi, tanya-jawab)
│   └── command.controller.ts    # Menangani perintah bot (/start, /help, /status, /info)
├── models/
│   ├── api.client.ts            # Client HTTP ke backend API (x-internal-secret, timeout, retry)
│   └── types.ts                 # Kontrak DTO / Interface payload komunikasi Bot <-> API
├── views/
│   └── telegram.view.ts         # Template pesan, format Markdown, inline button konfirmasi
├── router.ts                    # Routing pesan grammY ke controller yang sesuai
├── bot.manager.ts               # BotManager: Mengelola banyak instance bot per tenant
├── index.ts                     # Entrypoint modul telegram (ekspor manager, fungsi kirim pesan)
└── implementasi.md              # Dokumen arsitektur ini
```

---

## 4. 🔌 Kontrak Komunikasi Data

### A. Inbound (Pesan Masuk dari Pengguna Telegram ➡️ API)
Ketika ada pesan masuk ke bot salah satu tenant, `chat.controller` membungkus data dan memanggil `api.client.ts`:
- **Target URL**: `http://api:3000/api/chat/inbound`
- **Header Keamanan**:
  ```http
  x-internal-secret: <INTERNAL_API_SECRET>
  Content-Type: application/json
  ```
- **Payload Request**:
  ```json
  {
    "channel": "telegram",
    "bot_id": "8655389335",
    "external_message_id": "1049281",
    "sender_id": "99281726",
    "sender_name": "Fulan",
    "sender_username": "fulan_umkm",
    "chat_id": "99281726",
    "chat_type": "private",
    "message_type": "text",
    "text": "Beli gula 2 kg 30000",
    "timestamp": 1729388400
  }
  ```
- **Response dari API**:
  ```json
  {
    "status": "success",
    "reply_text": "Catatan Pengeluaran: Gula 2 kg Rp 30.000.\nApakah ingin dibukukan sekarang?",
    "action_buttons": [
      { "label": "✅ Ya, Simpan", "callback_data": "confirm_trx_abc" },
      { "label": "❌ Batalkan", "callback_data": "cancel_trx_abc" }
    ]
  }
  ```

---

### B. Outbound (API ➡️ Bot untuk Kirim Notifikasi/Pengingat)
Ketika backend API memiliki pengingat jadwal, tagihan, atau laporan harian:
- **Target URL**: `POST http://bot:3001/send`
- **Header Keamanan**: `x-internal-secret: <INTERNAL_API_SECRET>`
- **Payload Request**:
  ```json
  {
    "channel": "telegram",
    "bot_id": "8655389335",
    "recipient_id": "99281726",
    "message": "Halo! Berikut ringkasan kas toko Anda hari ini...",
    "options": {
      "parse_mode": "HTML"
    }
  }
  ```
- `BotManager` akan mengambil bot instance yang sesuai dan mengirimkannya via `bot.api.sendMessage`.

---

## 5. 🌐 Cara Menjalankan Dual-Mode: Lokal vs Server Tailscale

### Skenario 1: Test di Laptop Lokal (Tanpa Tailscale / Tanpa Internet Masuk)
1. Cukup jalankan bot seperti biasa dengan `TELEGRAM_MODE=polling`.
2. Bot akan membuat koneksi outbound ke server Telegram secara polling.
3. Anda bisa langsung chat dengan bot Telegram Anda di HP/desktop dan pesan akan langsung diterima oleh laptop lokal Anda!

### Skenario 2: Test di Server Tailscale
1. Aktifkan Tailscale Funnel / Tailscale Serve atau reverse proxy domain Tailscale:
   ```bash
   tailscale funnel 3001
   ```
2. Set variabel di `.env`:
   ```env
   TELEGRAM_MODE=webhook
   TELEGRAM_WEBHOOK_URL=https://<tailscale-node>.ts.net/telegram/webhook
   ```
3. `BotManager` otomatis mendaftarkan webhook URL ke Telegram API saat bot dijalankan.

---

## 6. 🛡️ Resilience & Fault Tolerance
1. **Fallback Saat API Tidak Siap**:
   - Jika `http://api:3000` down atau sedang reboot, pengguna menerima balasan fallback yang ramah dari `telegram.view.ts` tanpa bot mengalami crash.
2. **Idempotensi**:
   - `external_message_id` diteruskan agar transaksi tidak tercatat dua kali jika ada pengiriman ulang.
3. **Graceful Shutdown**:
   - Saat container dimatikan (`SIGTERM`/`SIGINT`), seluruh bot instance di-stop secara rapi untuk menghindari update telegram yang tersangkut.
