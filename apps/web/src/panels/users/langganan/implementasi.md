# Rancangan Arsitektur & Implementasi UI: Halaman Langganan

Dokumen ini mendefinisikan cetak biru teknis (*technical blueprint*) untuk implementasi antarmuka pengguna **Langganan & Penagihan (Billing)** pada dashboard pemilik usaha (`apps/web`), mematuhi standar arsitektur baku proyek Meseid (`AGENTS.md`) dan kaidah reaktivitas Svelte 5 Runes.

---

## 1. Analisis Kebutuhan & Fitur Utama

Halaman Langganan berfungsi sebagai pusat pengelolaan paket komersial akun, pemantauan konsumsi token AI, riwayat transaksi pembayaran (Midtrans), dan program rujukan sesama UMKM:

1. **Header & Metadata Usaha (`LanggananHeader.svelte`)**:
   - Judul berkarakter monospace retro-modern: `Langganan`.
   - Subjudul transparan: *"Pilih paket sesuai kebutuhan usaha. Pembayaran lewat Midtrans."*
   - Metadata label dinamis: Nama usaha, peran, tanggal & waktu sistem.
   - Garis aksen hijau khas Meseid dengan titik di kedua ujungnya.

2. **Status Paket & Sakelar Tagihan Tahunan (`StatusAndToggleCard.svelte`)**:
   - Penanda status paket aktif: `🟢 Paket saat ini · Gratis` | *Belum ada langganan Pro aktif pada contoh utama ini.*
   - Sakelar interaktif **Tagihan tahunan** (Aktif/Nonaktif) yang secara dinamis memperbarui harga paket Pro dan menghitung penghematan tahunan (setara diskon 2 bulan).

3. **Perbandingan Paket Usaha (`PaketPricingCards.svelte`)**:
   - **Kartu Gratis (Rp 0)**:
     - Deskripsi: *"Untuk mulai merapikan catatan usaha."*
     - Fitur: *Catat lewat chat* dan *Ringkasan usaha*.
     - Badge status: `🟢 Paket Anda`.
   - **Kartu Pro (Highlight Hijau Lembut `bg-[#F0FDF4]`)**:
     - Harga dinamis: `Rp 49.000/bulan` (atau `Rp 490.000/tahun`).
     - Fitur: *Kebutuhan usaha rutin* dan *Tinjau sebelum membayar*.
     - Tombol aksi adaptif: `Pilih Pro bulanan` / `Pilih Pro tahunan`.
     - Catatan transparansi: *"Ringkasan checkout: Rp 49.000 · sekali untuk periode bulanan, bukan top-up token."*

4. **Konsumsi Token AI & Pembelian Top-Up (`TokenUsageAndTopupCard.svelte`)**:
   - **Kolom Kiri (Kuota Token · Ilustrasi)**:
     - Badge status ketersediaan: `🟢 Masih cukup`.
     - Meteran penggunaan: `3.600 / 10.000` (`36%`) dengan progress bar hijau.
     - Callout edukatif: Pengurangan token saat bot membaca dan membalas chat, serta jadwal reset periode berikutnya (1 November 2026).
   - **Kolom Kanan (Tambah Token)**:
     - Nominal terjangkau: `Rp 20.000`.
     - Penjelasan: Pembelian top-up terpisah dan tidak mengaktifkan/memperpanjang status Pro.
     - Tombol aksi: `Tinjau top-up`.

5. **Log Audit Riwayat Pembayaran (`RiwayatPembayaranCard.svelte`)**:
   - Tabel riwayat transaksi dengan font monospace:
     - Kolom: `Pesanan`, `Produk`, `Tanggal`, `Jumlah`, `Status`.
     - Data spesimen: `TOP-DEMO-0920 · Top-up token (bukan Pro) · 20 Sep 2026 · Rp 20.000 · Berhasil · Bukti ↗`.
   - Keterangan independensi: Transaksi langganan terpisah dari jurnal pembukuan penjualan operasional.

6. **Program Rujukan UMKM (`ReferralBannerCard.svelte`)**:
   - Ajakan berbagi: *"Bagikan Meseid ke sesama pemilik usaha."*
   - Kode rujukan unik pemilik usaha: `MESEID-RINA-DEMO` (font monospace).
   - Tombol aksi: `Salin kode` (dengan feedback toast tersalin) dan `Lihat ketentuan`.

---

## 2. Kepatuhan Standar AGENTS.md

- **File-Level SRP (Single Responsibility Principle)**: Setiap komponen menangani satu subseksi visual secara mandiri tanpa ada berkas *god-object*.
- **Line Count Limits**: Target 30–150 baris per file, batas keras mutlak < 400 baris.
- **Svelte 5 Runes**: Menggunakan `$state()`, `$derived()`, dan `$props()`. Tidak mendeklarasikan nama variabel `state` lokal.
- **Multi-Tenant RLS Ready**: Konfigurasi langganan dan kuota terikat pada `owner_id`.

---

## 3. Rencana Struktur Berkas & Komponen

Semua berkas akan ditempatkan di direktori baru: `apps/web/src/panels/users/langganan/`:

```
apps/web/src/panels/users/langganan/
├── implementasi.md                         # Blueprint arsitektur ini
├── langganan.types.ts                      # Definisi tipe data langganan, paket, & riwayat (~35 baris)
├── LanggananRoot.svelte                    # Komponen koordinator / container utama (~75 baris)
└── components/
    ├── LanggananHeader.svelte              # Header judul, deskripsi, metadata & garis aksen (~35 baris)
    ├── StatusAndToggleCard.svelte          # Banner paket aktif & switch tahunan (~60 baris)
    ├── PaketPricingCards.svelte            # Grid 2 kartu: Gratis & Pro (~110 baris)
    ├── TokenUsageAndTopupCard.svelte       # Progress bar kuota token & kartu top-up Rp 20k (~115 baris)
    ├── RiwayatPembayaranCard.svelte        # Tabel riwayat pesanan Midtrans (~80 baris)
    └── ReferralBannerCard.svelte           # Kartu ajak teman usaha & salin kode (~65 baris)
```

---

## 4. Langkah Eksekusi Kode

1. Buat tipe data pada `langganan.types.ts`.
2. Buat seluruh subkomponen di dalam `components/`.
3. Buat komponen koordinator `LanggananRoot.svelte`.
4. Sambungkan ke `UserDashboard.svelte` pada percabangan `activeTab === 'langganan'`.
5. Uji ketepatan dengan `bun run check` (0 error, 0 warning) dan lakukan build dengan `bun run build`.
6. Sinkronisasi berkas build ke container Docker Nginx `meseid-web-1` dan reload Nginx.
7. Siapkan laporan hasil implementasi.
