# Rencana Implementasi: Halaman Jam Operasional (`Jam Operasional`)

Dokumen ini adalah cetak biru teknis untuk pembangunan antarmuka pengguna (UI) halaman **Jam Operasional** pada `apps/web`. Dokumen ini disusun untuk memastikan kepatuhan terhadap prinsip arsitektur [AGENTS.md](file:///d:/Project-Sync-Enbee/meseid/AGENTS.md), kemiripan visual 100% dengan desain referensi, serta integrasi terstruktur dengan kolom basis data PostgreSQL `bot_configs.business_hours` dan `owners.timezone`.

---

## 1. Ringkasan Fitur & Sasaran

- **Tujuan Halaman**: Memberikan antarmuka bagi Pemilik Usaha (*Owner*) untuk mengatur:
  1. **Jadwal Mingguan Reguler**: Konfigurasi jam operasional harian (Senin s.d. Minggu) lengkap dengan switch buka/tutup dan jam layanan.
  2. **Pengecualian Tanggal (*Date Exceptions*)**: Penetapan hari libur khusus atau jadwal istimewa (misal: libur keluarga pada tanggal tertentu) tanpa mengganggu jadwal mingguan reguler.
  3. **Pesan Otomatis Luar Jam Operasional**: Template balasan otomatis bot ramah ketika pelanggan mengirimkan pesan di luar jam buka usaha, lengkap dengan simulasi pratinjau pesan di hari libur.
- **Pendekatan Pengembangan**: 100% *Frontend-first* berbasis **Svelte 5 Runes** (`$state()`, `$derived()`, `$props()`, `$bindable()`) dengan token styling Meseid (`font-intel`, `font-inter`, `#FAFAFA`, `#1ED10E`, `#0E6B2B`).

---

## 2. Struktur Modul & Dekomposisi Berkas (Kepatuhan Penuh AGENTS.md)

Sesuai aturan baku **"1 Berkas = 1 Fungsi Operasi"** dan batas baris berkas (ideal 30–150 baris, batas keras < 400 baris), halaman Jam Operasional dipecah secara modular di bawah `apps/web/src/panels/users/jam-operasional/`:

```
apps/web/src/panels/users/jam-operasional/
├── JamOperasionalRoot.svelte          <- [Container Utama / Koordinator Tab Jam Operasional] (± 80 baris)
├── jam-operasional.types.ts           <- [Tipe Data & Kontrak Antarmuka] (± 50 baris)
├── implementasi.md                    <- [Dokumen Rencana Teknis ini]
└── components/
    ├── JamOperasionalHeader.svelte    <- [Header, Subtitle, Divider, & Banner Zona Waktu] (± 55 baris)
    ├── WeeklyScheduleCard.svelte      <- [Kartu Jadwal Mingguan 7 Hari & Tombol Simpan] (± 140 baris)
    ├── ScheduleExceptionsCard.svelte  <- [Kartu Pengecualian Tanggal Khusus] (± 80 baris)
    └── OutOfHoursReplyCard.svelte     <- [Kartu Balasan Luar Jam Buka & Pratinjau Chat] (± 110 baris)
```

---

## 3. Rincian Komponen & Desain Visual

### 1. `JamOperasionalHeader.svelte`
- Judul: `Jam Operasional` (`font-intel`).
- Subtitle 1: `Jam warung yang jelas, agar pelanggan tahu kapan dilayani.`
- Subtitle 2: `Data contoh · {businessName} · {role} · {dateText}`.
- Divider bar: Garis horizontal hijau tipis dengan lingkaran penanda di kedua ujungnya.
- Banner Zona Waktu Hijau:
  `Zona waktu: Asia/Jakarta (WIB) · Bot menjawab info dasar 24 jam. Pelayanan Bu Rina tetap mengikuti jam buka warung.`

### 2. `WeeklyScheduleCard.svelte` (Jadwal Mingguan)
- Judul Kartu: `Jadwal mingguan`.
- Daftar 7 Hari:
  - **Senin s.d. Sabtu**:
    - Switch ON dengan status `Aktif` dan label `[Hari] · Buka`.
    - Input jam awal (`08.00 WIB`) sampai jam akhir (`20.00 WIB`).
  - **Minggu**:
    - Switch OFF dengan status `Nonaktif` dan label `Minggu · Tutup`.
    - Input jam disembunyikan dan diganti dengan teks: `Tidak menerima layanan manusia pada hari Minggu.`
- Tombol: `Simpan jam usaha` (hijau `#1ED10E`, rounded-xl) dengan umpan balik visual saat berhasil disimpan.

### 3. `ScheduleExceptionsCard.svelte` (Pengecualian Tanggal)
- Judul Kartu: `Pengecualian tanggal`.
- Item pengecualian terdaftar:
  - Header: `Selasa, 20 Oktober 2026 / Edit ↗`.
  - Deskripsi: `Libur keluarga · Warung tutup sepanjang hari`.
- Tombol: `Tambah pengecualian` (putih berbingkai, rounded-xl).
- Keterangan: `Pengecualian menggantikan jadwal mingguan hanya pada tanggal tersebut.`

### 4. `OutOfHoursReplyCard.svelte` (Balasan di Luar Jam Buka)
- Judul Kartu: `Balasan di luar jam buka`.
- Toggle Switch Box: `Balasan luar jam · Aktif` (Aktif/Nonaktif).
- Textarea `Pesan otomatis`: Template teks balasan yang sopan dan menjelaskan jam buka berikutnya.
- Tombol: `Simpan balasan` (hijau `#1ED10E`, rounded-xl).
- Area Pratinjau: `Pratinjau · Minggu, 18 Okt 2026` dengan bubble chat asisten (`Rini · Asisten`) berwarna hijau muda `#E8F9E6` yang langsung mencerminkan isi template pesan.

---

## 4. Pemetaan Tabel Basis Data (Database Mapping)

Seluruh data halaman ini dapat disimpan secara efisien ke dalam tabel PostgreSQL yang sudah ada:

| Elemen UI Jam Operasional | Tabel / Kolom PostgreSQL Sumber | File Migrasi |
|---|---|---|
| Zona Waktu Usaha | `owners.timezone` (`Asia/Jakarta`) | `002_tenancy.sql` |
| Nama Asisten di Pratinjau | `bot_configs.admin_bot_name` | `002_tenancy.sql` |
| Status Aktif Balasan Luar Jam | `bot_configs.auto_reply_enabled` | `002_tenancy.sql` |
| Jadwal 7 Hari & Jam Buka/Tutup | `bot_configs.business_hours` (JSONB: key `weekly`) | `002_tenancy.sql` |
| Pengecualian Tanggal Libur | `bot_configs.business_hours` (JSONB: key `exceptions`) | `002_tenancy.sql` |
| Template Pesan Balasan Luar Jam | `bot_configs.business_hours` (JSONB: key `outOfHours`) | `002_tenancy.sql` |

---

## 5. Integrasi ke `UserDashboard.svelte`

- Pada [UserDashboard.svelte](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/UserDashboard.svelte):
  Ketika `activeTab === 'jam-operasional'`, area `<main>` akan me-render `<JamOperasionalRoot />`.
- Mendukung direct link URL `/dashboard?tab=jam-operasional` dan navigasi instan lewat tab Jam Operasional di sidebar kiri.

---

## 6. Rencana Pengujian Black-Box (UAT)

1. Membuka browser pada route `http://localhost/dashboard?tab=jam-operasional`.
2. Menguji interaksi toggle switch hari (misal: mengaktifkan hari Minggu dan memverifikasi input jam muncul kembali).
3. Menguji perubahan jam pada hari Senin–Sabtu.
4. Menguji pengeditan teks pesan balasan otomatis dan memverifikasi bubble pratinjau di bawahnya langsung terbarukan (*real-time*).
5. Memverifikasi tata letak 2 kolom (Kiri: Jadwal mingguan, Kanan: Pengecualian & Balasan luar jam) responsif di desktop maupun layar kecil.
