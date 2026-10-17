<div align="center">

<img src="apps/public/logo_polos.png" alt="Meseid Logo" width="200" />

# Meseid

**Asisten bisnis AI di WhatsApp dan Telegram untuk UMKM.**
_Just text it. We'll do the books._

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Runtime](https://img.shields.io/badge/runtime-Bun%20%7C%20Node.js-black)
![Backend](https://img.shields.io/badge/backend-Elysia.js%20%7C%20Hono-green)
![Frontend](https://img.shields.io/badge/frontend-SvelteKit%205%20%2B%20Tailwind%204-orange)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-blue)
![Web Server](https://img.shields.io/badge/proxy-Nginx-009639)
![Docker](https://img.shields.io/badge/deploy-Docker-2496ED)
![License](https://img.shields.io/badge/license-AGPL--3.0-purple)

</div>

---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Arsitektur dan Alur Data](#arsitektur-dan-alur-data)
- [Pemantauan Memory](#pemantauan-memory)
- [Tech Stack](#tech-stack)
- [Struktur Folder](#struktur-folder)
- [Instalasi & Menjalankan dengan Docker](#instalasi--menjalankan-dengan-docker)
- [Setup Lokal Manual (Non-Docker)](#setup-lokal-manual-non-docker)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Skema Database](#skema-database)
- [Perintah yang Tersedia](#perintah-yang-tersedia)
- [Pengujian](#pengujian)
- [Keamanan dan Privasi](#keamanan-dan-privasi)
- [Penulis](#penulis)

---

## Tentang Proyek

Meseid adalah platform asisten bisnis berbasis AI untuk pelaku UMKM yang berjalan di **WhatsApp** dan **Telegram**, sehingga pengguna tidak perlu memasang aplikasi baru. Pemilik usaha (Owner) cukup mengirim pesan teks atau foto struk, dan Meseid akan mencatat transaksi, menyusun laporan, mengatur jadwal, serta menjawab pertanyaan pelanggan (Pembeli) selama 24 jam.

Proyek ini diinisiasi dan didanai oleh client. Platform dimiliki client, sedangkan pelanggannya adalah pelaku UMKM.

### Peran Pengguna

| Peran            | Deskripsi                                                                                        | Antarmuka                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **Owner**        | Pelaku UMKM pemilik bisnis. Mengelola transaksi, laporan, jadwal, dan konfigurasi bot.           | WhatsApp/Telegram (mode Asisten) dan dashboard web |
| **Pembeli**      | Pelanggan Owner. Hanya mendapat jawaban dari knowledge base, tanpa akses data sensitif.          | WhatsApp/Telegram (mode Pembeli)                   |
| **Admin Sistem** | Memantau pemakaian token, biaya, log error, kuota, dan penangguhan akun. Hanya melihat metadata. | Panel admin web                                    |

---

## Fitur Utama

Requirement dirumuskan dalam **49 functional requirement (FR-01 sampai FR-49)** yang dikelompokkan dalam lima modul, ditambah 8 kelompok non-functional requirement.

| Modul                    | Cakupan                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Asisten AI (Chat)**    | Identifikasi Owner/Pembeli, layanan Asisten, layanan Pembeli dari knowledge base, konfirmasi aksi, fallback saat AI gagal         |
| **Keuangan dan Dokumen** | Jurnal umum, buku besar, neraca saldo, buku kas dan pembantu, OCR bukti transaksi, analisis dan penyusunan laporan, versi dokumen |
| **Penjadwalan**          | Buat/edit/hapus jadwal, cek bentrok, pengingat, booking oleh Pembeli (Google Calendar)                                            |
| **Dashboard Owner**      | Login Google, profil, tautan WhatsApp/Telegram, persona bot, knowledge base, jam operasional, langganan dan pembayaran            |
| **Administrasi Sistem**  | Daftar Owner (metadata saja), pemakaian token dan biaya, log error, alert, kuota dan paket, penangguhan akun                      |

### Paket Langganan

|                 | Gratis                                            | Pro                                                |
| --------------- | ------------------------------------------------- | -------------------------------------------------- |
| Model AI        | API AI gratis                                     | Beberapa model berbayar (misalnya Qwen, Kimi)      |
| Batas pemakaian | Limit harian/bulanan                              | Kuota token sesuai paket, bisa top-up              |
| Fitur           | Fitur inti chat, catat transaksi, layanan Pembeli | Seluruh fitur, kualitas jawaban dan OCR lebih baik |
| Harga (usulan)  | Rp 0                                              | Rp 49.000/bulan                                    |

> Harga bersifat usulan dan perlu divalidasi dengan biaya model AI, biaya Midtrans, dan keputusan client.

---

## Arsitektur dan Alur Data

### Pendekatan: modular monolith + bot terpisah

Backend dibangun sebagai **satu API (modular monolith)** dengan modul yang jelas batasnya sesuai lima modul SRS. Proyek ini **tidak** dipecah menjadi banyak microservices karena pengembang satu orang, waktu 6 minggu, server pengembangan terbatas (RAM 4 GB), dan posting jurnal harus berjalan dalam satu transaksi database (rollback jika gagal).

Satu pemisahan dilakukan dengan sengaja: **bot WhatsApp dan Telegram dijalankan di container sendiri**, terpisah dari API. Alasannya, Baileys tidak resmi dan menyimpan sesi koneksi yang panjang (risiko terbesar di SRS), serta pemakaian memory per container lebih mudah dilacak dan dibatasi. Jika sesi Baileys bermasalah, API dan dashboard tetap hidup.

| Container    | Isi                                                                                                | Peran                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **api**      | Elysia.js: logika bisnis, keuangan, AI, dokumen, jadwal, langganan, REST untuk dashboard dan admin | Satu-satunya yang menyentuh data bisnis                         |
| **bot**      | Baileys (WhatsApp) dan Telegram Bot API dalam satu service                                         | Gerbang kanal yang tipis                                        |
| **postgres** | PostgreSQL dengan volume persisten                                                                 | Penyimpanan data                                                |
| **web**      | SvelteKit 5 (SPA) + Nginx: Landing, dashboard Owner, panel Admin                                   | Antarmuka web pengguna & reverse proxy `/api/` ke container API |

```
WhatsApp (Baileys) ──┐
                     ├──> [ bot ] ──(jaringan internal Docker)──> [ api ] ──> [ postgres ]
Telegram Bot API ────┘                                              │
                                                                    ├──> AI Provider (LLM / OCR)
[ web ] (dashboard Owner + panel Admin) ──────────────────────────> ├──> Google Drive / Calendar / Gmail
                                                                    └──> Midtrans (pembayaran)
```

### Aturan untuk bot: harus tipis

Bot hanya **menerima pesan, meneruskannya ke API, lalu mengirim balasan**. Router Owner/Pembeli, konfirmasi aksi, pengecekan kuota, dan fallback tetap berada di API. Dengan begitu logika bisnis hanya ada di satu tempat dan prinsip SRS bahwa seluruh data melewati backend tetap terjaga.

Konsekuensi yang harus ditangani:

- **Autentikasi antar-service:** bot ke API memakai secret internal, dan komunikasi hanya lewat jaringan internal Docker.
- **API tidak tersedia:** bot memiliki antrean/retry kecil agar pesan tidak hilang (sejalan dengan M2-H2).
- **Idempotensi:** pesan yang dikirim ulang oleh bot tidak boleh menghasilkan transaksi atau jadwal ganda (TC-15).
- **Sesi Baileys:** disimpan di volume Docker, bukan di dalam container, agar restart tidak meminta scan QR ulang.

### Alur pemrosesan pesan

1. Pesan masuk ke **bot** (WhatsApp/Telegram), diteruskan ke **api**.
2. API memverifikasi keasliannya dan mengecek duplikat (idempotensi).
3. API memeriksa langganan dan kuota token. Jika kuota habis atau AI gagal, balasan fallback dikirim.
4. Pengirim dicocokkan dengan nomor/ID Owner terdaftar: Owner dilayani **mode Asisten**, selain itu **mode Pembeli** (hanya dari knowledge base).
5. Konteks minimum dikirim ke AI Provider.
6. Aksi yang mengubah data meminta **konfirmasi Owner** lebih dulu.
7. Hasil disimpan ke PostgreSQL/Google Drive, pemakaian token dicatat, lalu balasan dikembalikan ke bot untuk dikirim ke pengguna.

### Prinsip penting

- Seluruh angka keuangan (saldo, laba rugi, neraca) **dihitung oleh logika program, bukan oleh AI**.
- Transaksi disimpan setelah Owner menyetujui ringkasan.
- Validasi jurnal: total debit harus sama dengan total kredit, dan posting berjalan dalam satu transaksi database.
- Setiap laporan disimpan sebagai versi baru sebelum diekspor (PDF/Word/Excel).

### Keputusan Arsitektur Terkini

- **Telegram: webhook atau long polling.** SRS menyebut webhook Telegram (M1-H3). Pada fase development lokal menggunakan mode polling (dapat diubah ke webhook pada environment produksi via `.env`).
- **Frontend dashboard:** **Telah diputuskan & diimplementasikan.** Dipisah menjadi service `web` mandiri berbasis SvelteKit statis (SPA) yang disajikan oleh Nginx Alpine, sekaligus berfungsi sebagai reverse proxy untuk rute `/api/` ke container `api`.
- **Kapan worker lain dipisah:** Worker OCR dan analisis AI berat tetap berada di dalam modular monolith `api` untuk tahap awal, dan baru akan dipisah jika kebutuhan skalabilitas sudah terbukti.

---

## Tech Stack

| Lapisan                        | Teknologi                                                              | Keterangan                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Runtime Backend (API)**      | [Bun](https://bun.sh) (v1+)                                            | Runtime performa tinggi untuk service `api`                                 |
| **Backend API**                | [Elysia.js](https://elysiajs.com)                                      | Modular monolith: logika bisnis, akuntansi, AI, auth, & REST                |
| **Runtime Bot**                | [Node.js](https://nodejs.org) (v22 Slim)                               | Runtime stabil untuk kompatibilitas socket & web crypto                     |
| **Bot Gateway**                | [Hono](https://hono.dev) (`@hono/node-server`)                         | Micro-server internal perantara kanal chat ke backend API                   |
| **Frontend Web**               | [SvelteKit](https://kit.svelte.dev) 5 + [Svelte 5](https://svelte.dev) | SPA untuk dashboard Owner, panel Admin, dan landing page                    |
| **Web Server & Reverse Proxy** | [Nginx](https://nginx.org) Alpine                                      | Penyaji file statis SPA & proxy `http://localhost:8080/api/*` ke `api:3000` |
| **Styling CSS**                | [Tailwind CSS](https://tailwindcss.com) v4                             | Framework utility-first CSS modern via `@tailwindcss/vite`                  |
| **Database**                   | [PostgreSQL](https://www.postgresql.org) 16 Alpine                     | Penyimpanan relasional persisten via Docker volume                          |
| **Kontainerisasi**             | [Docker](https://www.docker.com) & Docker Compose                      | 4 service terisolasi (`web`, `api`, `bot`, `postgres`)                      |
| **Struktur Repo**              | Monorepo (`apps/api`, `apps/bot`, `apps/web`)                          | Kode terpusat dalam satu repository                                         |
| **Kanal WhatsApp**             | [Baileys](https://github.com/WhiskeySockets/Baileys) (v7 RC)           | Integrasi WhatsApp Web (sesi disimpan di volume Docker)                     |
| **Kanal Telegram**             | [grammY](https://grammy.dev) (v1.46+)                                  | Telegram Bot API framework                                                  |
| **Autentikasi**                | Google OAuth 2.0                                                       | Login aman untuk Owner dan Admin sistem                                     |
| **Integrasi Google**           | Drive, Calendar, Gmail                                                 | Penyimpanan dokumen laporan dan penjadwalan meeting                         |
| **AI Multi-Model**             | Provider LLM & OCR                                                     | Adapter fleksibel (OpenAI, Anthropic, Qwen, Kimi, dll.)                     |
| **Pembayaran**                 | [Midtrans](https://midtrans.com)                                       | Payment gateway langganan (Sandbox / Production)                            |
| **Pengujian**                  | `bun test`, [Vitest](https://vitest.dev)                               | Pengujian otomatis unit & integrasi                                         |

---

## Struktur Folder

> Usulan struktur awal (monorepo). Sesuaikan dengan kondisi repo yang sebenarnya.

```
meseid/
├── apps/
│   ├── api/                      # container: api
│   │   ├── src/
│   │   │   ├── index.ts          # entry point Elysia
│   │   │   ├── config/           # env, konstanta
│   │   │   ├── modules/
│   │   │   │   ├── chat/         # router Owner/Pembeli, konfirmasi, fallback
│   │   │   │   ├── finance/      # jurnal, buku besar, kas, pembantu
│   │   │   │   ├── documents/    # OCR, Drive, laporan, ekspor
│   │   │   │   ├── schedule/     # Google Calendar, booking
│   │   │   │   ├── owner/        # dashboard, knowledge base, persona
│   │   │   │   ├── billing/      # paket, kuota, Midtrans
│   │   │   │   └── admin/        # token, log, alert, suspend
│   │   │   ├── adapters/ai/      # adapter AI Provider multi-model
│   │   │   ├── db/
│   │   │   │   ├── schema/       # definisi tabel
│   │   │   │   └── migrations/
│   │   │   └── lib/              # util, logger, pencatat token
│   │   ├── tests/                # unit, API, integrasi
│   │   └── Dockerfile
│   ├── bot/                      # container: bot (tipis)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── whatsapp/         # Baileys, pairing/QR
│   │   │   ├── telegram/         # Telegram Bot API
│   │   │   └── forwarder/        # klien ke api, antrean/retry kecil
│   │   └── Dockerfile
│   └── web/                      # dashboard Owner + panel Admin + landing
├── docker-compose.yml
├── .env.example
└── README.md
```

Sesi Baileys disimpan di **volume Docker** (bukan di dalam image/container).

---

## Instalasi & Menjalankan dengan Docker

Seluruh layanan Meseid telah dikonfigurasi dan diverifikasi penuh agar dapat di-build dan berjalan secara terisolasi tanpa error menggunakan Docker dan Docker Compose.

### Prasyarat

- [Docker Engine](https://docs.docker.com/get-docker/) (v20+ atau versi terbaru)
- [Docker Compose](https://docs.docker.com/compose/) (v2+ atau Docker Desktop / WSL 2)

### Konfigurasi Environment

Salin template konfigurasi `.env.example` ke file `.env` di root direktori proyek:

```bash
cp .env.example .env
```

Pastikan variabel-variabel kunci berikut terdefinisi (default development sudah disediakan untuk pengujian lokal):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Kredensial dan nama database PostgreSQL.
- `INTERNAL_API_SECRET`: Secret bersama untuk autentikasi komunikasi bot internal ke API.
- `SESSION_SECRET`, `ENCRYPTION_KEY`: Kunci enkripsi sesi dan data kredensial.
- `WEB_PORT`: Port host untuk antarmuka web (default: `8080`).

### Perintah Menjalankan Proyek

Jalankan langkah-langkah berikut dari root direktori proyek (`meseid/`):

1. **Build image seluruh service:**

   ```bash
   docker compose build
   ```

2. **Jalankan seluruh container di background:**

   ```bash
   docker compose up -d
   ```

   _(Atau gabungkan build dan up dalam satu langkah: `docker compose up -d --build`)_

3. **Periksa status container:**

   ```bash
   docker compose ps
   ```

   Seluruh service akan berstatus `Up` dengan indikator `(healthy)`.

4. **Verifikasi respons endpoint:**

   ```bash
   # Akses Web UI (SvelteKit Nginx SPA)
   curl -i http://localhost:8080/

   # Akses API melalui reverse proxy Nginx Web UI
   curl -i http://localhost:8080/api/health

   # Akses langsung API (port 3000)
   curl -i http://127.0.0.1:3000/health
   ```

### Daftar Service & Port

| Service      | Runtime / Base Image                | Port Host / Internal                      | URL Akses Lokal                                | Status Healthcheck                  |
| ------------ | ----------------------------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| **web**      | Nginx Alpine (SvelteKit Static SPA) | `8080:80` (dapat diubah via `WEB_PORT`)   | [http://localhost:8080](http://localhost:8080) | - (Reverse Proxy ke API di `/api/`) |
| **api**      | Bun 1 + Elysia.js                   | `127.0.0.1:3000:3000`                     | [http://127.0.0.1:3000](http://127.0.0.1:3000) | `healthy` (`GET /health`)           |
| **bot**      | Node.js 22 Slim + Hono              | `3001` _(hanya jaringan internal Docker)_ | `http://bot:3001` _(internal)_                 | `healthy` (`GET /health`)           |
| **postgres** | PostgreSQL 16 Alpine                | `127.0.0.1:5432:5432`                     | `localhost:5432`                               | `healthy` (`pg_isready`)            |

> **Catatan Endpoint & Jaringan:**
>
> - Web UI berfungsi sebagai reverse proxy: request ke `http://localhost:8080/api/*` secara otomatis diteruskan ke container `api:3000`.
> - Service `bot` tidak mengekspos port ke host luar demi keamanan; API berkomunikasi dengan bot secara internal melalui URL `http://bot:3001`.
> - Port PostgreSQL dibuka hanya di `127.0.0.1:5432` untuk kemudahan migrasi database dan seed data dari laptop pengembang.

### Perintah Tambahan

- **Melihat log seluruh service secara real-time:**
  ```bash
  docker compose logs -f
  ```
- **Melihat log service spesifik (misal: api atau bot):**
  ```bash
  docker compose logs -f api
  docker compose logs -f bot
  docker compose logs -f web
  docker compose logs -f postgres
  ```
- **Menghentikan seluruh container:**
  ```bash
  docker compose down
  ```
- **Menghentikan container dan menghapus volume data (reset total database & sesi):**
  ```bash
  docker compose down -v
  ```
- **Memantau konsumsi resource (RAM & CPU) per container:**
  ```bash
  docker stats
  ```

---

## Setup Lokal Manual (Non-Docker)

Jika ingin menjalankan service secara individual di mesin lokal tanpa Docker penuh:

### Prasyarat

- [Bun](https://bun.sh) (v1+)
- [Node.js](https://nodejs.org) (v20+)
- PostgreSQL 16 berjalan di lokal

### Langkah-langkah

1. Jalankan PostgreSQL lokal atau via Docker:
   ```bash
   docker compose up -d postgres
   ```
2. Pasang dependensi dan jalankan migrasi database:
   ```bash
   bun install
   bun run db:migrate
   ```
3. Jalankan API:
   ```bash
   bun run --cwd apps/api dev
   ```
4. Jalankan Bot:
   ```bash
   npm --prefix apps/bot run dev
   ```
5. Jalankan Web:
   ```bash
   bun run --cwd apps/web dev
   ```

---

## Konfigurasi Environment

Contoh isi `.env.example`:

```env
# Umum
NODE_ENV=development

# ===== api =====
API_PORT=3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://meseid:password@localhost:5432/meseid

# Google OAuth dan layanan Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# AI Provider
AI_PROVIDER_API_KEY=
AI_DEFAULT_MODEL_FREE=
AI_DEFAULT_MODEL_PRO=

# Midtrans (gunakan sandbox saat development)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# Keamanan
SESSION_SECRET=
ENCRYPTION_KEY=

# ===== komunikasi antar-service (bot <-> api) =====
INTERNAL_API_SECRET=
API_INTERNAL_URL=http://api:3000

# ===== bot =====
TELEGRAM_BOT_TOKEN=
TELEGRAM_MODE=webhook            # webhook | polling (keputusan masih terbuka)
TELEGRAM_WEBHOOK_SECRET=
WA_SESSION_PATH=/data/wa-session # harus berada di volume Docker
```

> **Jangan pernah meng-commit file `.env`.** Pastikan `.env` ada di `.gitignore`. Token bot dan secret yang bocor harus segera diganti.

---

## Skema Database

Skema PostgreSQL diturunkan dari SDD. Tabel inti yang digunakan alur data:

| Tabel              | Fungsi                                           |
| ------------------ | ------------------------------------------------ |
| `chat_logs`        | Log chat ringkas (tanpa isi pesan di log sistem) |
| `jurnal_umum`      | Jurnal umum, validasi debit = kredit             |
| `buku_besar`       | Buku besar hasil posting jurnal                  |
| `buku_kas`         | Buku kas dan saldo berjalan                      |
| `buku pembantu`    | Utang dan piutang                                |
| `knowledge_base`   | Data produk, harga, jam, FAQ per Owner           |
| `bot_configs`      | Persona bot, jam operasional, konfigurasi kanal  |
| `subscriptions`    | Status paket Gratis/Pro dan kuota                |
| `payment_history`  | Riwayat pembayaran Midtrans                      |
| `token_usage_logs` | Pemakaian token per panggilan AI                 |
| `system_logs`      | Log sistem yang dilihat Admin                    |

Daftar lengkap tabel, relasi, dan ERD ada di dokumen SDD. Semua data Owner harus **terisolasi per tenant**, dan posting jurnal harus berjalan dalam satu transaksi (rollback jika salah satu langkah gagal).

---

## Perintah yang Tersedia

| Perintah                       | Fungsi                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| `bun run dev:api`              | Menjalankan API (development)                                       |
| `bun run dev:bot`              | Menjalankan bot WhatsApp/Telegram (development)                     |
| `bun run start`                | Menjalankan server produksi                                         |
| `bun run db:migrate`           | Menjalankan migrasi database                                        |
| `bun test`                     | Menjalankan seluruh test                                            |
| `docker compose up -d --build` | Menjalankan semua container di background                           |
| `docker compose down`          | Menghentikan semua container                                        |
| `docker compose logs -f api`   | Melihat log satu service (ganti `api` dengan `bot` atau `postgres`) |
| `docker stats`                 | Memantau pemakaian CPU dan memory per container                     |

> Sesuaikan daftar ini dengan script yang benar-benar ada di `package.json`.

---

## Pemantauan Memory

Server pengembangan terbatas (Intel Pentium Gold, RAM 4 GB), sehingga pemakaian memory perlu dipantau per container:

- Pasang `mem_limit` per service di `docker-compose.yml`, terutama untuk **bot**, agar kebocoran di satu service tidak menjatuhkan seluruh server.
- Pakai `restart: unless-stopped` agar service yang terkena limit hidup kembali sendiri.
- Pantau dengan `docker stats`. Untuk jangka panjang, kirim metrik sederhana ke `system_logs` sesuai kebutuhan alert Admin.
- Ukur pemakaian RAM tiap service saat idle dan saat beban (batas uji performa: 3 Owner, 10 pesan per menit), lalu tentukan nilai `mem_limit` dari hasil ukur, bukan dari perkiraan.

---

## Pengujian

| Jenis      | Cakupan                                                                    | Alat                          |
| ---------- | -------------------------------------------------------------------------- | ----------------------------- |
| Black box  | Perilaku dari sisi pengguna: chat, dashboard, langganan                    | Skenario manual, kanal tiruan |
| White box  | Validasi jurnal, saldo, fallback, kuota token                              | `bun test`                    |
| API        | Otorisasi peran, webhook (signature valid/salah, duplikat), isolasi tenant | `bun test`, Postman/Insomnia  |
| Integrasi  | Chat, AI, database, Drive, Midtrans sandbox                                | Mock kanal, sandbox Midtrans  |
| Keamanan   | Prompt injection, SQL injection, XSS, CSRF, kebocoran antar Owner          | Skenario penyerang            |
| Performa   | 10 pesan/menit dari 3 Owner, pemrosesan mulai maks. 3 detik                | Skrip beban                   |
| Agentic AI | Agent pengguna tiruan dinilai LLM-as-a-judge                               | Agent, CI                     |
| UAT        | Pelaku UMKM mencoba setup tanpa bantuan                                    | Observasi, kuesioner          |

**Kriteria lulus:** seluruh test prioritas Tinggi lulus, tidak ada bug kritis terbuka, dan test deterministik keuangan dan keamanan lulus 100%.

---

## Keamanan dan Privasi

- Webhook diverifikasi keasliannya (signature) dan dicek duplikatnya.
- Komunikasi bot ke API memakai secret internal dan hanya lewat jaringan internal Docker.
- Data antar Owner terisolasi (multi-tenant).
- Admin Sistem hanya melihat metadata, **bukan isi chat atau dokumen keuangan**.
- Pembeli tidak dapat mengakses data sensitif atau laporan keuangan.
- Aksi yang mengubah data wajib dikonfirmasi Owner.
- Hanya konteks minimum yang dikirim ke AI Provider.
- Scope Google dibuat minimal.
- Pengguna dapat menghapus datanya, sesuai UU PDP No. 27/2022.

---

## Penulis

[**Enbee**](https://github.com/nplrahman922)

---

<div align="center">

© 2026 Meseid. All rights reserved.

</div>
