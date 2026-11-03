# Rencana Implementasi: Halaman Keuangan (`Keuangan`)

Dokumen ini adalah cetak biru teknis untuk pembangunan antarmuka pengguna (UI) halaman **Keuangan** pada `apps/web`. Dokumen ini disusun untuk memastikan kepatuhan penuh terhadap prinsip arsitektur [AGENTS.md](file:///d:/Project-Sync-Enbee/meseid/AGENTS.md), kemiripan visual 100% dengan desain referensi, serta integrasi presisi ke modul pembukuan ganda (*double-entry bookkeeping*) SAK EMKM dan view SQL PostgreSQL di `apps/api/src/db/migrations/`.

---

## 1. Ringkasan Fitur & Sasaran

- **Tujuan Halaman**: Memberikan visibilitas finansial yang transparan, otomatis, dan seimbang bagi Pemilik Usaha (*Owner*), mencakup:
  1. **Jurnal Umum**: Pencatatan transaksi debit-kredit terverifikasi yang berasal dari chat WhatsApp/Telegram, pembacaan OCR struk, atau entri manual.
  2. **Buku Besar (*General Ledger*)**: Pemantauan mutasi kas dan perhitungan saldo berjalan (*running balance*).
  3. **Neraca Saldo (*Trial Balance*)**: Pemeriksaan keseimbangan mutlak antara akun aset/beban (debit) dan modal/pendapatan (kredit).
  4. **Buku Kas (*Cash Flow*)**: Rincian arus kas masuk dan kas keluar dengan perhitungan saldo kas riil.
  5. **Buku Pembantu Utang / Piutang (*Subledger Aging*)**: Pengawasan tagihan pelanggan dan kewajiban ke pemasok.
- **Pendekatan Pengembangan**: 100% *Frontend-first* berbasis **Svelte 5 Runes** (`$state()`, `$derived()`, `$props()`, `$bindable()`) dengan token styling Meseid (`font-intel`, `font-inter`, `#FAFAFA`, `#1ED10E`, `#0E6B2B`).

---

## 2. Struktur Modul & Dekomposisi Berkas (Kepatuhan Penuh AGENTS.md)

Sesuai aturan baku **"1 Berkas = 1 Fungsi Operasi"** dan batas baris berkas (ideal 30–150 baris, batas keras < 400 baris), halaman Keuangan dipecah secara modular di bawah `apps/web/src/panels/users/keuangan/`:

```
apps/web/src/panels/users/keuangan/
├── KeuanganRoot.svelte                <- [Container Utama / Koordinator Tab Keuangan] (± 80 baris)
├── keuangan.types.ts                  <- [Tipe Data & Kontrak Antarmuka Keuangan] (± 60 baris)
├── implementasi.md                    <- [Dokumen Rencana Teknis ini]
└── components/
    ├── KeuanganHeader.svelte          <- [Header Judul, Subtitle, dan Garis Slider] (± 45 baris)
    ├── KeuanganNavTabs.svelte         <- [Sub-tab Switcher 5 Laporan Keuangan] (± 55 baris)
    ├── KeuanganActionBar.svelte       <- [Filter Periode, Tambah Transaksi, Export Excel] (± 45 baris)
    ├── JurnalUmumCard.svelte          <- [Kartu Tabel Jurnal Umum & Keseimbangan Debit=Kredit] (± 140 baris)
    ├── BukuBesarCard.svelte           <- [Kartu Buku Besar Spesimen - Akun 101 Kas] (± 85 baris)
    ├── NeracaSaldoCard.svelte         <- [Kartu Neraca Saldo Spesimen & Status Seimbang] (± 85 baris)
    ├── BukuKasCard.svelte             <- [Kartu Buku Kas Spesimen, Mutasi & Saldo Akhir] (± 110 baris)
    └── SubledgerUtangPiutangCard.svelte <- [Kartu Utang/Piutang Spesimen & Status Pelunasan] (± 70 baris)
```

---

## 3. Rincian Komponen & Desain Visual

### 1. `KeuanganHeader.svelte`
- Judul: `Keuangan` (`font-intel`).
- Subtitle 1: `Catatan usaha yang seimbang, dari chat sampai laporan.`
- Subtitle 2: `Data contoh · {businessName} · {role} · {dateText}`.
- Divider bar: Garis horizontal hijau tipis dengan penanda lingkaran di kedua ujungnya.

### 2. `KeuanganNavTabs.svelte` (5 Tab Pembukuan)
- Baris 1: `Jurnal Umum` (default aktif dengan indikator hijau), `Buku Besar`, `Neraca Saldo`.
- Baris 2: `Buku Kas`, `Utang/Piutang`.
- Mengklik tab memungkinkan pengguna memfilter fokus ke satu laporan tertentu atau melihat tampilan komprehensif bersusun.

### 3. `KeuanganActionBar.svelte` (Aksi & Filter)
- Tombol filter periode: `1–16 Okt 2026` (putih berbingkai, rounded-xl).
- Tombol aksi utama: `Tambah transaksi` (hijau `#1ED10E`, rounded-xl).
- Tombol ekspor: `Export Excel` (putih berbingkai, rounded-xl).

### 4. `JurnalUmumCard.svelte` (Tabel Jurnal Umum)
- Badge status keseimbangan: `● Debit = Kredit` (hijau muda `#E8F9E6`).
- Info transaksi: `Periode: 1–16 Oktober 2026 · 4 transaksi · Saldo awal 1 Okt: sebelum mencatat Rp 0`.
- Tabel jurnal debit-kredit:
  - Baris 1: `01 Okt` | `JU-001` | `Kas` / `Modal Owner` | `Rp 1.000.000` | `Rp 1.000.000`.
  - Baris 2: `15 Okt` | `JU-002` | `Kas` / `Pendapatan katering` | `Rp 1.250.000` | `Rp 1.250.000`.
  - Baris 3: `16 Okt` | `JU-003` | `Beban bahan` / `Kas` | `Rp 125.000` | `Rp 125.000`.
  - Baris 4: `16 Okt` | `JU-004` | `Kas` / `Pendapatan teh` | `Rp 450.000` | `Rp 450.000`.
- Footer total: `4 transaksi` | `Debit = Kredit: Rp 0` | `Total debit: Rp 2.825.000` | `Total kredit: Rp 2.825.000`.
- Kotak rincian: Callout informasi akun dan tombol `Detail JU-003`.

### 5. Banner Pratinjau Hijau
- `Pratinjau laporan di bawah · Ringkasan otomatis untuk membantu membaca buku. Tampilan utama tetap Jurnal Umum.`

### 6. Dua Kolom Tengah: `BukuBesarCard.svelte` & `NeracaSaldoCard.svelte`
- **Buku Besar**: Menampilkan mutasi dan saldo berjalan (*running balance*) Akun 101 (Kas) dari `JU-001` hingga `JU-004` (saldo akhir `Rp 2.575.000`).
- **Neraca Saldo**: Menampilkan saldo akhir akun debit (`Kas` Rp 2.575.000, `Beban bahan` Rp 125.000) dan kredit (`Modal Owner` Rp 1.000.000, `Pendapatan` Rp 1.700.000) dengan total seimbang `Rp 2.700.000`.

### 7. `BukuKasCard.svelte` (Aliran Kas)
- Tabel mutasi kas: Checkbox, Tanggal, Keterangan, Badge Jenis (`Masuk` hijau / `Keluar` abu-abu), dan Nominal.
- Footer saldo: `Saldo kas akhir: Rp 2.575.000`.

### 8. `SubledgerUtangPiutangCard.svelte` (Utang/Piutang)
- Menampilkan status utang (`Rp 0 - Tidak ada kewajiban tercatat`) dan piutang (`Rp 0 - Semua penjualan contoh dibayar tunai`).

---

## 4. Pemetaan Tabel Basis Data (Database Mapping)

| Elemen UI Keuangan | Tabel / View PostgreSQL Sumber | File Migrasi |
|---|---|---|
| Jurnal & Baris Transaksi | `jurnal_umum`, `jurnal_baris` | `005_finance_journal.sql` |
| Validasi Keseimbangan Debit=Kredit | Trigger `check_journal_balance()` | `005_finance_journal.sql` |
| Buku Besar & Running Balance | View `buku_besar` | `008_finance_reports.sql` |
| Neraca Saldo | View `neraca_saldo` | `008_finance_reports.sql` |
| Buku Kas & Mutasi Masuk/Keluar | View `buku_kas` (`is_cash = true`) | `008_finance_reports.sql` |
| Subledger Utang & Piutang | Tabel `buku_pembantu` & view `subledger_aging` | `005_finance_journal.sql`, `008_finance_reports.sql` |

---

## 5. Integrasi ke `UserDashboard.svelte`

- Pada [UserDashboard.svelte](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/UserDashboard.svelte):
  Ketika `activeTab === 'keuangan'`, area `<main>` akan me-render `<KeuanganRoot />`.
- Mendukung direct link URL `/dashboard?tab=keuangan` serta navigasi langsung dari tombol `Lihat Keuangan` di halaman Beranda.

---

## 6. Rencana Pengujian Black-Box (UAT)

1. Membuka browser pada route `http://localhost/dashboard?tab=keuangan` (atau klik tombol "Lihat Keuangan" di Beranda).
2. Memverifikasi seluruh 5 kartu pembukuan (Jurnal Umum, Buku Besar, Neraca Saldo, Buku Kas, Utang/Piutang) tampil proporsional dan matematisnya seimbang.
3. Menguji pergantian sub-tab antara `Jurnal Umum`, `Buku Besar`, `Neraca Saldo`, `Buku Kas`, dan `Utang/Piutang`.
4. Menguji interaksi tombol `Detail JU-003` dan checkbox pada tabel mutasi kas.
5. Memverifikasi tata letak responsif desktop dan mobile.
