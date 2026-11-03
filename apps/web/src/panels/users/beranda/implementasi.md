# Rencana Implementasi: Halaman Beranda (`Beranda`)

Dokumen ini adalah cetak biru teknis untuk pembangunan antarmuka pengguna (UI) halaman **Beranda** di sisi frontend aplikasi web Meseid (`apps/web`). Dokumen ini disusun untuk memastikan keselarasan visual penuh dengan desain referensi, kepatuhan arsitektur [AGENTS.md](file:///d:/Project-Sync-Enbee/meseid/AGENTS.md), serta kesiapan integrasi penuh ke tabel-tabel PostgreSQL riil yang ada pada sistem.

---

## 1. Ringkasan Fitur & Sasaran

- **Tujuan Halaman**: Memberikan ringkasan operasional harian (*Executive Dashboard*) bagi Pemilik Usaha (*Owner*) mencakup:
  1. Ringkasan metrik finansial, volume pesan, dan kuota AI secara sekilas.
  2. Status ringkas koneksi 3 saluran utama (WhatsApp, Telegram, Google).
  3. Visualisasi arus kas mingguan dengan grafik batang (Senin s.d. Jumat) beserta surplus kas.
  4. Log riwayat 4 aktivitas transaksi & pembaruan dokumen terkini.
  5. Agenda jadwal terdekat beserta deteksi jadwal bentrok (*conflict alert*).
- **Pendekatan Pengembangan**: 100% *Frontend-first* berbasis **Svelte 5 Runes** (`$state()`, `$derived()`, `$props()`, `$bindable()`) dengan token styling Meseid (`font-intel`, `font-inter`, `#FAFAFA`, `#1ED10E`, `#0E6B2B`).
- **Tab Default**: Halaman ini menjadi tampilan default pada dasbor pengguna saat `activeTab === 'beranda'`.

---

## 2. Struktur Modul & Dekomposisi Berkas (Kepatuhan Penuh AGENTS.md)

Sesuai aturan baku **"1 Berkas = 1 Fungsi Operasi"** dan batas baris berkas (ideal 30–150 baris, batas keras < 400 baris), halaman Beranda dipecah secara modular di bawah `apps/web/src/panels/users/beranda/`:

```
apps/web/src/panels/users/beranda/
├── BerandaRoot.svelte                 <- [Container Utama / Koordinator Beranda] (± 70 baris)
├── beranda.types.ts                  <- [Tipe Data & Kontrak Antarmuka Beranda] (± 60 baris)
├── implementasi.md                    <- [Dokumen Rencana Teknis ini]
└── components/
    ├── BerandaHeader.svelte           <- [Header Salam, Tanggal, dan Garis Dekorasi] (± 50 baris)
    ├── MetricsCardsGrid.svelte        <- [4 Kartu Metrik: Transaksi, Saldo Kas, Pesan, Token] (± 110 baris)
    ├── ChannelSummaryGrid.svelte      <- [3 Kartu Mini Ringkasan Kanal: WA, TG, Google] (± 90 baris)
    ├── WeeklyFinanceCard.svelte       <- [Kartu Laporan Keuangan Mingguan & Bar Chart] (± 120 baris)
    ├── RecentActivityCard.svelte      <- [Kartu Riwayat 4 Aktivitas Terbaru] (± 100 baris)
    └── UpcomingSchedulesCard.svelte   <- [Kartu Jadwal Mendatang & Peringatan Bentrok] (± 90 baris)
```

---

## 3. Rincian Komponen & Desain Visual

### 1. `BerandaHeader.svelte`
- **Judul Utama**: `Beranda` (`font-intel`, tracking-wide).
- **Salam**: `Selamat pagi, {userName}. Ini kabar usaha hari ini.` (menyesuaikan waktu dan nama owner).
- **Sub-info**: `Data contoh · {businessName} · {role} · {dateText}`.
- **Divider Slider**: Garis horizontal hijau tipis dengan lingkaran border di kedua ujungnya.

### 2. `MetricsCardsGrid.svelte` (4 Kartu Metrik)
Tata letak grid responsif (4 kolom pada desktop, 2 pada tablet, 1 pada mobile):
1. **Transaksi bulan ini**:
   - Angka: `4 transaksi` (`font-intel`).
   - Subtext: `4 catatan terverifikasi`.
   - Periode: `1–16 Oktober 2026`.
   - Indikator tren: Ikon panah serong hijau (`↗`).
2. **Saldo kas**:
   - Angka: `Rp 2.575.000` (`font-intel`).
   - Subtext: `Awal Rp 1.000.000`.
   - Periode: `1–16 Oktober 2026` + panah hijau (`↗`).
3. **Pesan hari ini**:
   - Angka: `24 pesan` (`font-intel`).
   - Subtext: `WhatsApp & Telegram`.
   - Periode: `1–16 Oktober 2026` + panah hijau (`↗`).
4. **Sisa kuota token**:
   - Angka: `6.400 token` (`font-intel`).
   - Subtext: `64% tersisa · ilustrasi`.
   - Periode: `1–16 Oktober 2026` + panah hijau (`↗`).

### 3. `ChannelSummaryGrid.svelte` (3 Kartu Status Kanal)
Tata letak grid 3 kolom:
1. **WhatsApp**: Badge status `● Terhubung` (hijau), keterangan `Nomor demo **** 0123`.
2. **Telegram**: Badge status `● Terhubung` (hijau), keterangan `@warungburina_demo_bot`.
3. **Google**: Badge status `● Terhubung` (hijau), keterangan `Calendar & Drive · Gmail nonaktif`.

### 4. `WeeklyFinanceCard.svelte` (Laporan Mingguan & Bar Chart)
- **Judul & Periode**: `Laporan minggu ini` (`12–16 Oktober 2026 · minggu berjalan`).
- **Angka Surplus**: `Rp 1.575.000` (`font-intel`, tebal).
- **Rincian**: `Surplus kas · masuk Rp 1.700.000 - keluar Rp 125.000`.
- **Grafik Batang (Bar Chart)**: 5 hari (Sen, Sel, Rab, Kam, Jum):
  - Sen, Sel, Rab: Garis dasar tipis hijau (`Rp 0`).
  - Kam: Batang hijau tinggi (`Rp 1.250.000`).
  - Jum: Batang hijau sedang (`Rp 450.000`).
- **Rincian Teks**: `Pemasukan: Sen-Rab Rp 0 · Kam Rp 1.250.000 · Jum Rp 450.000`.
- **Tombol**: `Lihat Keuangan` (mengarahkan ke tab Keuangan).

### 5. `RecentActivityCard.svelte` (Aktivitas Terbaru)
- **Judul**: `Aktivitas terbaru`.
- **4 Item Riwayat**:
  1. `Penjualan teh dicatat / Rp 450.000` (16 Okt · 09.45 WIB · WhatsApp).
  2. `Belanja bahan terverifikasi / Rp 125.000` (16 Okt · 09.42 WIB · Struk terbaca).
  3. `Laporan Oktober diperbarui / Lihat file ↗` (16 Okt · 09.30 WIB · PDF versi 3).
  4. `Pesanan katering dicatat / Rp 1.250.000` (15 Okt · 14.00 WIB · Telegram).

### 6. `UpcomingSchedulesCard.svelte` (Jadwal Mendatang)
- **Judul**: `Jadwal mendatang`.
- **2 Blok Agenda Terdekat**:
  - `Ambil katering · Ibu Sari` (Sabtu, 17 Okt · 11.00–11.30 WIB · Dikonfirmasi).
  - `Belanja stok mingguan` (Senin, 19 Okt · 08.00–09.00 WIB · Pengingat Owner).
- **Footer**:
  - Tombol `Buka Jadwal` (mengarahkan ke tab Jadwal).
  - Peringatan: `1 permintaan bentrok perlu ditinjau.`

---

## 4. Pemetaan Tabel Basis Data (Database Compliance)

Seluruh komponen pada halaman Beranda ini 100% didukung oleh migrasi database PostgreSQL yang telah ada:

| Elemen UI Beranda | Tabel / Fungsi PostgreSQL Sumber | File Migrasi |
|---|---|---|
| Transaksi bulan ini | `jurnal_umum`, `jurnal_baris` (filter `tx_date`) | `005_finance_journal.sql` |
| Saldo kas | View `buku_kas` & `accounts` (`is_cash = true`) | `004_finance_accounts.sql`, `008_finance_reports.sql` |
| Pesan hari ini | `inbound_messages` (filter `created_at >= CURRENT_DATE`) | `014_ingestion_chat.sql` |
| Sisa kuota token | `plans` (`daily_token_limit = 10000`) & `fn_consume_quota()` | `010_billing_plans.sql`, `011_quota_functions.sql` |
| Status Kanal (WA, TG, Google) | `channel_connections` & `google_connections` | `002_tenancy.sql`, `014_ingestion_chat.sql` |
| Arus kas mingguan | View `buku_kas` (agregasi `cash_in` & `cash_out` per `tx_date`) | `008_finance_reports.sql` |
| Dokumen versi (PDF versi 3) | `documents` (`kind = 'laporan'`) & `document_versions` (`version_no = 3`) | `013_documents_scheduling.sql` |
| Agenda & Deteksi bentrok | `schedules`, `bookings`, `fn_check_conflict()`, GiST exclusion | `013_documents_scheduling.sql` |

---

## 5. Integrasi ke `UserDashboard.svelte`

1. Di [UserDashboard.svelte](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/UserDashboard.svelte):
   Ketika `activeTab === 'beranda'`, `<main>` akan me-render `<BerandaRoot />` secara default.
2. Mendukung navigasi antar-tab: Tombol `Lihat Keuangan` dan `Buka Jadwal` akan memicu pergantian tab aktif ke `'keuangan'` atau `'jadwal'`.
3. Sinkronisasi query param: Mendukung direct link `/dashboard?tab=beranda` maupun saat pertama kali membuka `/dashboard`.

---

## 6. Rencana Pengujian Black-Box (UAT)

1. Membuka browser pada route `http://localhost/dashboard` (default ke tab Beranda).
2. Memverifikasi seluruh 4 baris kartu (Metrik, Kanal, Grafik/Aktivitas, Jadwal) tampil proporsional dan responsif.
3. Menguji navigasi tombol `Lihat Keuangan` dan `Buka Jadwal` untuk memastikan transisi tab bekerja dengan baik.
4. Memverifikasi font monospaced (`font-intel`) dan palet warna Meseid tampil konsisten dengan mockup.
