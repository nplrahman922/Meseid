# Rencana Implementasi: Halaman Kanal & Integrasi (`Kanal & Integrasi`)

Dokumen ini adalah cetak biru teknis untuk pembangunan antarmuka (UI) halaman **Kanal & Integrasi** di sisi frontend aplikasi web Meseid (`apps/web`). Dokumen ini disusun untuk memastikan keselarasan visual penuh dengan desain referensi, kepatuhan arsitektur [AGENTS.md](file:///d:/Project-Sync-Enbee/meseid/AGENTS.md), dan kesiapan integrasi database di masa mendatang.

---

## 1. Ringkasan Fitur & Sasaran

- **Tujuan Halaman**: Memberikan dasbor terpadu bagi pemilik usaha (*Owner*) untuk memantau status koneksi bot WhatsApp, bot Telegram, integrasi Google Workspace (Calendar, Drive, Gmail), hak akses grup/nomor (*customer access mode* & whitelist), serta catatan riwayat koneksi.
- **Pendekatan**: 100% *Frontend-first* berbasis **Svelte 5 Runes** (`$state()`, `$derived()`, `$props()`). Logika backend dan API riil diikat melalui antarmuka data terstruktur (*mockable stub*) sehingga siap dihubungkan langsung ke tabel `channel_connections`, `google_connections`, dan `bot_configs`.
- **Koreksi Terhadap Mockup Desain (Persetujuan User)**:
  - Mengubah judul tabel di kartu Hak Akses dari yang sebelumnya rancu *"Transaksi terbaru"* menjadi **"Daftar Nomor & Grup Terdaftar"**.
  - Mengisi baris tabel dengan identitas kontak/grup yang relevan (misal: "Tim Admin Bu Rina", "Nomor Operasional / Kasir", "Nomor Supplier Bahan"), bukan nama transaksi belanja/penjualan.

---

## 2. Struktur Modul & Dekomposisi Berkas (Kepatuhan Penuh AGENTS.md)

Sesuai aturan baku **"1 Berkas = 1 Fungsi Operasi"** dan batas baris berkas (ideal 30–150 baris, batas keras < 400 baris), halaman Kanal dipecah menjadi berkas-berkas mandiri berikut di bawah `apps/web/src/panels/users/kanal/`:

```
apps/web/src/panels/users/kanal/
├── KanalRoot.svelte                     <- [Container Utama / Koordinator Tab] (± 80 baris)
├── kanal.types.ts                       <- [Tipe Data & Kontrak Antarmuka] (± 50 baris)
├── implementasi.md                      <- [Dokumen Rencana Teknis ini]
└── components/
    ├── KanalHeader.svelte               <- [Header, Subtitle, & Banner Kesehatan Koneksi] (± 50 baris)
    ├── WhatsAppCard.svelte              <- [Kartu WhatsApp: Status, Mock QR, Reconnect, OTP] (± 110 baris)
    ├── TelegramCard.svelte              <- [Kartu Telegram: Token, Webhook Health, OTP] (± 100 baris)
    ├── GoogleIntegrationCard.svelte     <- [Kartu Google: Scope Toggles Calendar, Drive, Gmail] (± 110 baris)
    ├── AllowedContactsCard.svelte       <- [Kartu Hak Akses: Mode Open/Restricted & Tabel Whitelist] (± 130 baris)
    └── ConnectionLogsCard.svelte        <- [Kartu Catatan Koneksi: Log Audit Berkala] (± 60 baris)
```

---

## 3. Detail Komponen & Desain Visual

### 1. `KanalHeader.svelte`
- Menampilkan judul utama `Kanal & Integrasi` dengan font monospaced (`font-intel`).
- Subtitle: `Satu usaha, semua percakapan dan dokumen terhubung.`
- Indikator konteks data usaha (nama usaha, role, tanggal dan waktu lokal).
- Banner status hijau: `✓ Kesehatan koneksi baik · WhatsApp, Telegram, dan Google tersambung. Terakhir diperiksa 10.00 WIB.`

### 2. `WhatsAppCard.svelte`
- Indikator status `Terhubung` (pill hijau dengan titik bulat).
- Nomor akun terhubung (disamarkan `**** 0123`).
- Area QR mock bertuliskan `[ QR ] DEMO / NON-AKTIF` dengan keterangan pendukung.
- Tombol aksi `Hubungkan ulang` dan `Putuskan koneksi`.
- Box Generate OTP dengan input tersamar dan tombol aksi `Generate Kode OTP`.

### 3. `TelegramCard.svelte`
- Indikator status `Terhubung` dan username bot `@warungburina_demo_bot`.
- Input token bot tersamar dengan tombol `Ganti token` dan `Tes koneksi`.
- Status `Webhook / Sehat - Periksa koneksi diberikan OK (200)`.
- Callout peringatan keamanan hijau untuk kerahasiaan token.
- Box Generate OTP khusus Telegram.

### 4. `GoogleIntegrationCard.svelte`
- Status akun Google yang terhubung beserta waktu sinkronisasi terakhir.
- 3 Kartu Layanan dengan Toggle Switch interaktif:
  - **Google Calendar**: Aktif (Izin baca/kelola acara kalender usaha).
  - **Google Drive**: Aktif (Akses folder Meseid untuk dokumen).
  - **Gmail (opsional)**: Nonaktif (Kirim laporan atas permintaan).
- Tombol aksi `Kelola Izin Google` dan `Cabut akses Google`.

### 5. `AllowedContactsCard.svelte`
- Toggle switch global: `Terbuka Untuk Semua Nomor` (Aktif/Nonaktif) yang merefleksikan `bot_configs.customer_access_mode`.
- Tabel Whitelist yang telah diperbaiki:
  - Header: **"Daftar Nomor & Grup Terdaftar"** dan counter `1 dipilih`.
  - Kolom: `Status`, `Nama / Deskripsi`, `Jenis`, `Nomor / Grup`.
  - Baris interaktif dengan checkbox dan badge `Active` / `Disabled`.
  - Pagination footer: `3 dari 28 kontak · Oktober 2026` dengan navigasi `Sebelumnya` & `Berikutnya`.

### 6. `ConnectionLogsCard.svelte`
- Menampilkan kartu riwayat log koneksi berkala dengan timestamp tebal dan rincian sistem.

---

## 4. Integrasi dengan `UserDashboard.svelte` & Navigasi

- Di [apps/web/src/panels/users/UserDashboard.svelte](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/UserDashboard.svelte):
  Ketika `activeTab === 'kanal'`, area `<main>` akan me-render `<KanalRoot />` secara mulus tanpa mengganggu tab lain.
- Mendukung query parameter URL `/dashboard?tab=kanal` sehingga halaman dapat diakses langsung.

---

## 5. Rencana Pengujian Black-Box (Verifikasi Frontend)

1. Membuka browser pada route `/dashboard` dan memilih tab **Kanal** di sidebar (atau URL langsung).
2. Memverifikasi seluruh 5 kartu tampil utuh, responsif di desktop maupun tablet/mobile.
3. Memverifikasi interaksi tombol (Generate OTP, toggle Google services, toggle access mode, dan checkbox daftar nomor).
4. Memverifikasi kesesuaian tipografi font monospaced (`font-intel`) dan warna sesuai design tokens Meseid.
