# Rancangan Arsitektur & Implementasi UI: Dokumen & Laporan

Dokumen ini mendefinisikan cetak biru teknis (*technical blueprint*) untuk implementasi antarmuka pengguna **Dokumen & Laporan** pada dashboard pemilik usaha (`apps/web`), mengacu pada desain visual yang disepakati dan kepatuhan arsitektur proyek Meseid (`AGENTS.md`).

---

## 1. Analisis Kebutuhan & Fitur Utama

Halaman Dokumen & Laporan berfungsi sebagai pusat penerbitan, pengunduhan, pengarsipan, dan pelacakan versi laporan keuangan usaha (SAK EMKM) dalam berbagai format:

1. **Header & Metadata Usaha (`DokumenHeader.svelte`)**:
   - Judul halaman berkarakter monospace retro-modern: `Dokumen & Laporan`.
   - Deskripsi singkat: *"Laporan tersimpan rapi, versi lama tetap mudah ditemukan."*
   - Metadata label dinamis: Nama usaha, peran, tanggal & jam sistem.
   - Garis dekoratif aksen hijau Meseid dengan titik di kedua ujungnya.

2. **Generator Laporan Interaktif (`BuatLaporanCard.svelte`)**:
   - Pilihan **Jenis Laporan**: `Laba Rugi` (periode berjalan) dan `Neraca` (posisi saldo per akhir periode) yang terhubung dengan fungsi database `fn_income_statement` dan `fn_balance_sheet`.
   - Input **Periode**: Default `1–16 Oktober 2026` dengan catatan penjelasan mikro di bawah kolom.
   - Pemilih **Format Ekspor**: Tiga opsi format (`PDF ✓`, `Word`, `Excel`).
   - Pratinjau Kalkulasi Real-time: Teks ringkasan interaktif, misalnya:
     `Preview Laba Rugi: pendapatan Rp 1.700.000 – beban bahan Rp 125.000 = laba Rp 1.575.000.`
   - Tombol Aksi Utama: Tombol hijau dinamis (`Buat laporan PDF`, `Buat laporan Word`, atau `Buat laporan Excel`).

3. **Log & Audit Riwayat File (`SemuaFileTableCard.svelte`)**:
   - Filter cepat: Chip `Jenis: Semua` dan `Periode: Oktober 2026`.
   - Tabel riwayat dokumen dengan kolom monospace:
     - `Nama file` (misal: `Laporan Oktober.pdf`, `Ringkasan usaha.docx`, `Transaksi Oktober.xlsx`)
     - `Isi / Periode` (kategori laporan dan rentang tanggal)
     - `Versi terbaru` (tagging versi `v1`, `v2`, `v3` beserta timestamp)
     - `Ukuran` (besaran file dalam KB)
     - `Tindakan` (tautan `Riwayat ↗`)
   - Tombol pemicu modal/drawer riwayat: `Riwayat Laporan Oktober.pdf`.

4. **Grid Akses Cepat Unduh Rilis Terbaru (`UnduhTerbaruGrid.svelte`)**:
   - Judul seksi: `Unduh versi terbaru` (font monospace).
   - 3 kartu sejajar (PDF, Word, Excel) masing-masing menampilkan:
     - Ikon dokumen hijau
     - Badge tipe format (PDF / Word / Excel)
     - Nama file rilis terkini
     - Metadata: Ukuran, tanggal cetak, dan nomor versi
     - Tombol unduh langsung: `↓ Unduh file`

5. **Banner Status Integrasi Cloud (`DriveSyncBanner.svelte`)**:
   - Latar hijau muda lembut (`bg-[#F0FDF4]`, `border-[#DCFCE7]`).
   - Keterangan status sinkronisasi ke Google Drive (`Folder Meseid / Warung Bu Rina`) dan panduan pengiriman via Kanal (WhatsApp / Email).

---

## 2. Kepatuhan Standar AGENTS.md

- **File-Level SRP (Single Responsibility Principle)**: Setiap komponen bertindak sebagai entitas mandiri yang tidak mencampurkan logika lain.
- **Line Count Limits**: Target 30–150 baris per file, batas keras mutlak < 400 baris.
- **Svelte 5 Runes**: Menggunakan `$state()`, `$derived()`, dan `$props()`. Tidak menggunakan variabel bernama `state` lokal untuk mencegah konflik dengan rune Svelte 5.
- **Multi-Tenant Compliance**: Seluruh data dan referensi entitas terikat pada `owner_id`.

---

## 3. Rencana Struktur Berkas & Komponen

```
apps/web/src/panels/users/dokumen/
├── implementasi.md                     # Dokumen blueprint ini
├── dokumen.types.ts                    # Kontrak tipe data file, versi, & form generator
├── DokumenRoot.svelte                  # Orkes / Root container halaman Dokumen (~75 baris)
└── components/
    ├── DokumenHeader.svelte            # Header judul, deskripsi, & garis aksen (~35 baris)
    ├── BuatLaporanCard.svelte          # Form generator laporan & live preview (~110 baris)
    ├── SemuaFileTableCard.svelte       # Tabel arsip file, filter, & link riwayat (~110 baris)
    ├── UnduhTerbaruGrid.svelte         # 3 Card grid download cepat per format (~80 baris)
    └── DriveSyncBanner.svelte          # Banner status integrasi Drive & Kanal (~25 baris)
```

---

## 4. Langkah Eksekusi Kode

1. Buat tipe data pada `dokumen.types.ts`.
2. Buat seluruh subkomponen di dalam `components/`.
3. Buat komponen koordinator `DokumenRoot.svelte`.
4. Sambungkan ke `UserDashboard.svelte` pada percabangan `activeTab === 'dokumen'`.
5. Uji ketepatan dengan `bun run check` dan lakukan build dengan `bun run build`.
6. Sinkronisasi berkas build ke container Docker Nginx `meseid-web-1` dan reload Nginx.
7. Siapkan laporan hasil implementasi.
