# Rancangan Arsitektur & Implementasi UI: Halaman Pengaturan (Kepatuhan UU PDP & Profil Usaha)

Dokumen ini mendefinisikan cetak biru teknis (*technical blueprint*) untuk implementasi antarmuka pengguna **Pengaturan & Kendali Data** pada dashboard pemilik usaha (`apps/web`), mematuhi kaidah arsitektur baku proyek Meseid (`AGENTS.md`), Svelte 5 Runes, serta regulasi **UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022)**.

---

## 1. Analisis Kebutuhan & Fitur Utama

Halaman Pengaturan berfungsi sebagai pusat kendali identitas profil usaha, proteksi privasi percakapan, hak portabilitas data, dan hak penghapusan data secara mandiri oleh pemilik usaha:

1. **Header & Metadata Usaha (`PengaturanHeader.svelte`)**:
   - Judul monospace khas Meseid: `Pengaturan`.
   - Subjudul transparan: *"Kelola profil usaha dan kendali atas data Anda."*
   - Metadata label dinamis: Nama usaha, peran pengguna, tanggal & waktu sistem.
   - Garis dekoratif aksen hijau Meseid dengan titik di kedua ujungnya.

2. **Profil Owner & Profil Usaha (`ProfilOwnerCard.svelte` & `ProfilUsahaCard.svelte`)**:
   - **Profil Owner**:
     - Kolom input: `Nama pemilik` (`Bu Rina`), `Email akun` (`rina@contoh.invalid`), dan `Peran` (`Owner · Pemilik usaha` - status terkunci/readonly).
     - Tombol aksi: `Simpan profil`.
   - **Profil Usaha**:
     - Kolom input: `Nama usaha` (`Warung Bu Rina`), `Jenis usaha` (`Warung makan & minuman`), `Alamat usaha` (`Jl. Melati No. 12, Bandung (contoh)`), dan `Zona waktu` (`Asia/Jakarta - WIB`).
     - Tombol aksi: `Simpan usaha`.

3. **Jaminan Privasi Percakapan (`PrivasiChatCard.svelte`)**:
   - Headline tegas: `Chat Anda tetap milik Anda.` (font monospace).
   - Penjelasan keterbukaan: *"Admin tidak dapat membaca chat Anda. Admin hanya melihat status koneksi, penggunaan layanan, dan langganan untuk membantu operasional."*
   - Tombol aksi: `Baca Kebijakan Privasi`.

4. **Portabilitas Data — UU PDP Pasal 13 (`EksporDataCard.svelte`)**:
   - Judul seksi: `Minta ekspor data`.
   - Deskripsi: *"Unduh salinan profil usaha, entri Knowledge Base, transaksi, dan dokumen yang tersimpan pada akun Anda."*
   - Banner callout: *"Permintaan belum dibuat. Setelah diajukan, status kesiapan file muncul di sini. Unduhan hanya tersedia untuk Owner yang terverifikasi."*
   - Tombol aksi: `Minta ekspor data` didampingi catatan penenang *"Ekspor tidak menghapus data atau menghentikan bot."*

5. **Penghapusan Data Permanen — UU PDP No. 27/2022 (`HapusDataUuPdpCard.svelte`)**:
   - Judul seksi: `Hapus data saya · UU PDP`.
   - Penegasan risiko: **Tindakan sensitif — bukan tombol simpan.**
   - Deskripsi dampak: Pencabutan profil, riwayat chat, entri pengetahuan, transaksi jurnal, dokumen, dan pemutusan koneksi bot tanpa pemulihan.
   - Banner panduan mikro: Imbauan ekspor data cadangan sebelum melanjutkan.
   - Tombol pemicu dialog konfirmasi: `Tinjau penghapusan data`.
   - Dialog Modal Konfirmasi: Mewajibkan pengguna mengetik persis teks verifikasi (misal: `"HAPUS WARUNG BU RINA"`) sebelum tombol eksekusi fungsi `delete_owner_data()` menjadi aktif.

---

## 2. Kepatuhan Standar AGENTS.md

- **File-Level SRP (Single Responsibility Principle)**: Setiap komponen menangani satu subseksi visual secara terisolasi tanpa komponen raksasa (*no god-objects*).
- **Line Count Limits**: Target 30–150 baris per file, batas keras mutlak < 400 baris.
- **Svelte 5 Runes**: Menggunakan `$state()`, `$derived()`, dan `$props()`. Tidak mendeklarasikan nama variabel `state` lokal.
- **Multi-Tenant RLS & Stored Procedure Compliance**:
  - Seluruh query terikat pada `owner_id`.
  - Fungsi penghapusan memanggil stored procedure kanonikal [`delete_owner_data(target_owner_id uuid)`](file:///d:/Project-Sync-Enbee/meseid/apps/api/src/db/migrations/017_erasure.sql).

---

## 3. Rencana Struktur Berkas & Komponen

Semua berkas akan ditempatkan di direktori baru: `apps/web/src/panels/users/pengaturan/`:

```
apps/web/src/panels/users/pengaturan/
├── implementasi.md                         # Blueprint arsitektur ini
├── pengaturan.types.ts                     # Definisi tipe data profil, ekspor data, & dialog hapus (~30 baris)
├── PengaturanRoot.svelte                   # Komponen koordinator / container utama (~75 baris)
└── components/
    ├── PengaturanHeader.svelte             # Header judul, deskripsi, metadata & garis aksen (~35 baris)
    ├── ProfilOwnerCard.svelte              # Form nama pemilik, email, dan peran terkunci (~75 baris)
    ├── ProfilUsahaCard.svelte              # Form nama usaha, jenis, alamat, & zona waktu (~85 baris)
    ├── PrivasiChatCard.svelte              # Kartu komitmen privasi percakapan & zero-knowledge (~45 baris)
    ├── EksporDataCard.svelte               # Kartu permintaan portabilitas data UU PDP (~70 baris)
    └── HapusDataUuPdpCard.svelte           # Kartu kendali penghapusan & modal verifikasi teks (~120 baris)
```

---

## 4. Langkah Eksekusi Kode

1. Siapkan migrasi ringan jika diperlukan: `ALTER TABLE owners ADD COLUMN IF NOT EXISTS address text;`.
2. Buat tipe data pada `pengaturan.types.ts`.
3. Buat seluruh subkomponen di dalam `components/`.
4. Buat komponen koordinator `PengaturanRoot.svelte`.
5. Sambungkan ke `UserDashboard.svelte` pada percabangan `activeTab === 'pengaturan'`.
6. Uji ketepatan dengan `bun run check` (0 error, 0 warning) dan lakukan build dengan `bun run build`.
7. Sinkronisasi berkas build ke container Docker Nginx `meseid-web-1` dan reload Nginx.
8. Buat laporan hasil implementasi.
