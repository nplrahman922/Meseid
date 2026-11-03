# Rancangan Arsitektur & Implementasi UI: Halaman Jadwal

Dokumen ini mendefinisikan cetak biru teknis (*technical blueprint*) untuk implementasi antarmuka pengguna **Jadwal & Kalender Operasional** pada dashboard pemilik usaha (`apps/web`), mengacu pada desain visual yang disetujui serta prinsip arsitektur baku proyek Meseid (`AGENTS.md`).

---

## 1. Analisis Kebutuhan & Keselarasan Sistem

Halaman Jadwal berfungsi sebagai titik temu operasional antara:
1. **Jam Operasional & Pengecualian**: Libur mingguan (Minggu) dan pengecualian khusus (Selasa, 20 Oktober - Libur keluarga) otomatis tercermin pada kalender.
2. **Keuangan SAK EMKM**: Pesanan katering terkonfirmasi (Ibu Sari, 17 Okt) terhubung dengan jurnal kas masuk `JU-002 (15 Okt)`. Permintaan baru diberi penanda jelas: *Belum dicatat sebagai penjualan* agar tidak merusak neraca sebelum transaksi sah.
3. **Kanal Bot & AI**: Permintaan pesanan bersumber langsung dari WhatsApp dan Telegram dengan parsing detail (nama pelanggan, jumlah nasi kotak, jam pengambilan).
4. **Collision Guard (Deteksi Bentrok)**: Mendeteksi tumpang tindih waktu antara acara terkonfirmasi dengan permintaan baru secara otomatis untuk mencegah kegagalan pelayanan di dapur usaha.

---

## 2. Kepatuhan Standar AGENTS.md

- **File-Level SRP (Single Responsibility Principle)**: Setiap komponen menangani satu fungsionalitas UI terfokus tanpa komponen raksasa (*no god-objects*).
- **Line Count Limits**: Target 30–150 baris per file, batas keras mutlak < 400 baris.
- **Svelte 5 Runes**: Menggunakan `$state()`, `$derived()`, dan `$props()`. Tidak mendeklarasikan variabel lokal atau prop bernama `state` untuk menghindari konflik reaktivitas rune.
- **Multi-Tenant RLS Ready**: Struktur tipe data dan komponen siap menerima data terikat `owner_id`.

---

## 3. Rencana Struktur Berkas & Komponen

Semua berkas akan ditempatkan di direktori baru: `apps/web/src/panels/users/jadwal/`:

```
apps/web/src/panels/users/jadwal/
├── implementasi.md                         # Blueprint arsitektur ini
├── jadwal.types.ts                         # Definisi tipe data kalender, event, & order request
├── JadwalRoot.svelte                       # Komponen koordinator / root view (~75 baris)
└── components/
    ├── JadwalHeader.svelte                 # Header judul, deskripsi, metadata & garis aksen (~35 baris)
    ├── JadwalNavTabs.svelte                # Tab Bulan/Minggu, tombol Tambah, & status Google Sync (~50 baris)
    ├── KalenderBulanCard.svelte            # Grid kalender Oktober 2026, navigasi, dot marker (~110 baris)
    ├── RincianJadwalGrid.svelte            # 2 Kolom: Acara terkonfirmasi & spesimen mingguan (~95 baris)
    └── PermintaanPembeliSection.svelte     # Banner bentrok & kartu pesanan (Bapak Dedi, Ibu Maya) (~120 baris)
```

---

## 4. Rincian Desain Komponen

### A. `jadwal.types.ts`
- Definisi tipe:
  - `CalendarViewMode = 'bulan' | 'minggu'`
  - `ConfirmedEvent`: `id`, `title`, `dateText`, `timeRange`, `customerName`, `note`, `type ('order' | 'reminder' | 'holiday')`
  - `WeeklyDaySchedule`: `dayName`, `dateNumber`, `eventText`, `isOff`
  - `OrderInquiry`: `id`, `customerName`, `orderSummary`, `slotDate`, `slotTime`, `channel ('whatsapp' | 'telegram')`, `receivedAt`, `hasCollision`, `collisionDetail`

### B. `JadwalHeader.svelte`
- Monospace title `Jadwal`, deskripsi *"Atur pesanan, pengingat, dan waktu usaha dalam satu kalender."*, serta garis aksen hijau Meseid.

### C. `JadwalNavTabs.svelte`
- Toggle view `Bulan` vs `Minggu`.
- Tombol aksi hijau `Tambah jadwal`.
- Banner hijau sinkronisasi: `✓ Google Calendar tersinkron · Kalender Warung Bu Rina · Terakhir 09.55 WIB`.

### D. `KalenderBulanCard.svelte`
- Kontrol navigasi `‹ Bulan lalu`, `Hari ini - 16 Okt`, `Bulan depan ›`.
- Header 7 hari: `Sen`, `Sel`, `Rab`, `Kam`, `Jum`, `Sab`, `Min`.
- Grid hari bulan Oktober 2026 dengan penanda hari ini `[16]`, dan titik acara: `17 •`, `19 •`, `20 •`.
- Catatan kaki / legenda penjelasan tanggal di bawah kalender.

### E. `RincianJadwalGrid.svelte`
- Kolom kiri: **Acara terkonfirmasi** (Sabtu 17 Okt Ambil katering Ibu Sari, Senin 19 Okt Belanja stok, Selasa 20 Okt Libur keluarga).
- Kolom kanan: **Minggu · spesimen** (Daftar hari 12–18 Oktober dengan indikator acara & libur Minggu).

### F. `PermintaanPembeliSection.svelte`
- Banner peringatan deteksi bentrok:
  `⚠️ 1 permintaan bentrok: Bapak Dedi, 17 Okt 11.15–11.45 WIB bertumpuk dengan Ibu Sari, 11.00–11.30 WIB. Pilih waktu lain sebelum menyetujui.`
- Kartu Bapak Dedi (30 nasi kotak): Badge `Perlu tinjau · bentrok`, tombol `Usulkan waktu lain`, `Setujui setelah ubah`, `Tolak`.
- Kartu Ibu Maya (15 nasi kotak): Badge `Waktu tersedia`, tombol `Setujui`, `Tolak`.

---

## 5. Rencana Langkah Kerja

1. **Pembuatan Blueprint**: Menulis `implementasi.md` (dokumen ini).
2. **Definisi Tipe**: Membuat `jadwal.types.ts`.
3. **Pembuatan Subkomponen**:
   - `JadwalHeader.svelte`
   - `JadwalNavTabs.svelte`
   - `KalenderBulanCard.svelte`
   - `RincianJadwalGrid.svelte`
   - `PermintaanPembeliSection.svelte`
4. **Pembuatan Koordinator**: `JadwalRoot.svelte`.
5. **Integrasi Routing Dashboard**: Menghubungkan tab `jadwal` di `UserDashboard.svelte`.
6. **Verifikasi Kualitas**: Menjalankan `bun run check` (0 error, 0 warning) dan `bun run build`.
7. **Deploy & Sinkronisasi**: Menyalin build ke Docker container `meseid-web-1` dan reload Nginx.
8. **Dokumentasi Hasil**: Membuat laporan hasil implementasi.
