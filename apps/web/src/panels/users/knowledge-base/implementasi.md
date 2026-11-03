# Rencana Implementasi: Halaman Knowledge Base (`Knowledge Base`)

Dokumen ini adalah cetak biru teknis untuk pembangunan antarmuka pengguna (UI) halaman **Knowledge Base** di sisi frontend aplikasi web Meseid (`apps/web`). Dokumen ini disusun untuk memastikan kepatuhan penuh terhadap arsitektur [AGENTS.md](file:///d:/Project-Sync-Enbee/meseid/AGENTS.md), kemiripan visual 100% dengan desain referensi, serta kesiapan integrasi penuh ke tabel-tabel PostgreSQL riil (`knowledge_base` dan `unanswered_questions`).

---

## 1. Ringkasan Fitur & Sasaran

- **Tujuan Halaman**: Memberikan antarmuka manajemen pusat pengetahuan bisnis bagi Pemilik Usaha (*Owner*), yang berfungsi sebagai otak rujukan bot cerdas dalam melayani percakapan pelanggan di WhatsApp dan Telegram.
- **Dua Pilar Utama Halaman**:
  1. **Entri Usaha (Tabel Utama)**: Menampilkan basis pengetahuan aktif yang telah disetujui, mencakup Judul/Pertanyaan, Kategori fleksibel, Jawaban/Detail, Tanggal Diperbarui, serta Aksi Edit. Dilengkapi fasilitas pencarian instan dan penyaringan kategori.
  2. **Pertanyaan Belum Terjawab (Tab/Kartu Sekunder)**: Menampilkan antrean pertanyaan yang diajukan pelanggan namun belum memiliki jawaban terdaftar di basis pengetahuan, lengkap dengan info asal kanal (WhatsApp/Telegram), waktu, frekuensi pertanyaan (*times asked*), dan tombol aksi cepat `Buat entri ↗`.
- **Pendekatan Pengembangan**: 100% *Frontend-first* berbasis **Svelte 5 Runes** (`$state()`, `$derived()`, `$props()`, `$bindable()`) dengan token styling resmi Meseid (`font-intel`, `font-inter`, `#FAFAFA`, `#1ED10E`, `#0E6B2B`).

---

## 2. Struktur Modul & Dekomposisi Berkas (Kepatuhan Penuh AGENTS.md)

Sesuai aturan baku **"1 Berkas = 1 Fungsi Operasi"** dan batas baris berkas (ideal 30–150 baris, batas keras < 400 baris), halaman Knowledge Base dipecah secara modular di bawah `apps/web/src/panels/users/knowledge-base/`:

```
apps/web/src/panels/users/knowledge-base/
├── KnowledgeBaseRoot.svelte            <- [Container Utama / Koordinator Tab KB] (± 80 baris)
├── knowledge-base.types.ts             <- [Tipe Data & Kontrak Antarmuka KB] (± 50 baris)
├── implementasi.md                     <- [Dokumen Rencana Teknis ini]
└── components/
    ├── KnowledgeBaseHeader.svelte      <- [Header Judul, Subtitle, dan Garis Slider] (± 50 baris)
    ├── KnowledgeBaseTabs.svelte        <- [Sub-tab Switcher: Entri Usaha vs Belum Terjawab] (± 45 baris)
    ├── KnowledgeBaseActions.svelte     <- [Tombol Aksi: Tambah Entri & Import CSV] (± 40 baris)
    ├── BusinessEntriesCard.svelte      <- [Kartu Tabel Entri Usaha: Search, Filter, Baris Data] (± 140 baris)
    ├── UnansweredQuestionsCard.svelte  <- [Kartu Pertanyaan Belum Terjawab & Buat Entri] (± 110 baris)
    └── AddEntryModal.svelte            <- [Modal Tambah / Edit Entri Pengetahuan Baru] (± 120 baris)
```

---

## 3. Rincian Komponen & Desain Visual

### 1. `KnowledgeBaseHeader.svelte`
- Menampilkan judul utama `Knowledge Base` dengan tipografi monospaced (`font-intel`).
- Subtitle 1: `Info usaha yang boleh dipakai bot untuk menjawab pembeli.`
- Subtitle 2: `Data contoh · {businessName} · {role} · {dateText}`.
- Divider bar: Garis horizontal hijau tipis dengan lingkaran penanda di kedua ujungnya.

### 2. `KnowledgeBaseTabs.svelte`
- Tab pengalih ganda:
  - **`Entri usaha (4)`**: Tab utama dengan garis penanda aktif hijau bawah (`border-b-2 border-[#1ED10E]`).
  - **`Pertanyaan belum terjawab (2)`**: Tab sekunder.
- Mengklik tab memungkinkan pengguna beralih antara fokus tabel entri atau fokus pertanyaan belum terjawab (atau menampilkan keduanya secara bersusun sesuai mode demonstrasi).

### 3. `KnowledgeBaseActions.svelte`
- Baris tombol aksi berdampingan:
  - Tombol **`Tambah entri`**: Tombol hijau utama (`bg-[#1ED10E] text-[#111111] hover:bg-[#1bb80d]`, rounded-xl) untuk memunculkan modal pembuatan entri pengetahuan baru.
  - Tombol **`Import CSV`**: Tombol putih berbingkai (`bg-white border border-[#111111] hover:bg-[#F3F4F6]`, rounded-xl).

### 4. `BusinessEntriesCard.svelte` (Tabel Entri Usaha)
- Kotak pencarian: Input `Cari entri` dengan placeholder `"Cari judul atau jawaban..."`.
- Baris filter & sortir:
  - Tombol dropdown kategori: `Kategori: Semua` (dapat memfilter ke *Produk / Harga*, *Jam operasional*, *FAQ*, atau kategori kustom).
  - Info ringkasan: `4 entri · Urutan: terbaru diperbarui`.
- Tabel data monospaced (`font-intel`):
  - Kolom: `Judul / Pertanyaan` | `Kategori` | `Jawaban / Detail` | `Diperbarui` | `Tindakan`.
  - Baris interaktif: Teks judul, label kategori abu-abu, teks jawaban, cap waktu pembaruan, dan tombol aksi `Edit ↗`.
- Footer: `Menampilkan 1-4 dari 4 entri · Semua kategori`.

### 5. `UnansweredQuestionsCard.svelte` (Pertanyaan Belum Terjawab)
- Banner info hijau: `Contoh panel tab sekunder · Tab utama tetap Entri usaha. Pertanyaan berikut belum memiliki jawaban yang disetujui Owner.`
- Daftar pertanyaan bot yang belum terpecahkan:
  - Judul pertanyaan + tombol pintas: `Ada pilihan tanpa gula? / Buat entri ↗`.
  - Subteks: `WhatsApp · 16 Okt 2026, 09.12 WIB · 3 kali ditanyakan`.
  - Aksi `Buat entri ↗` langsung membuka modal entri baru dengan judul terisi otomatis (*prefilled*).
- Footnote: `Bot tidak menebak jawaban. Tambahkan informasi yang benar sebelum dipakai untuk membalas.`

### 6. `AddEntryModal.svelte` (Modal Entri Baru / Edit)
- Dialog pop-up ringan untuk menambah/mengedit entri pengetahuan.
- Field: Judul / Pertanyaan, Pilihan Kategori, dan Teks Jawaban Lengkap.

---

## 4. Pemetaan Tabel Basis Data (Database Mapping)

| Elemen UI Knowledge Base | Tabel / Kolom PostgreSQL Sumber | File Migrasi |
|---|---|---|
| Judul Entri Usaha | `knowledge_base.title` | `002_tenancy.sql` |
| Kategori Entri | `knowledge_base.category` (kategori dinamis tanpa enum kaku) | `018_onboarding_enhancements.sql` |
| Jawaban / Detail | `knowledge_base.content` | `002_tenancy.sql` |
| Waktu Diperbarui | `knowledge_base.updated_at` | `002_tenancy.sql` |
| Pertanyaan Belum Terjawab | `unanswered_questions.question_text` | `014_ingestion_chat.sql` |
| Frekuensi Ditanyakan | `unanswered_questions.times_asked` | `014_ingestion_chat.sql` |
| Waktu Pertanyaan | `unanswered_questions.created_at` | `014_ingestion_chat.sql` |
| Asal Saluran (WhatsApp/Telegram) | Rekomendasi penambahan kolom `unanswered_questions.channel` | Rencana migrasi database berikutnya |

---

## 5. Integrasi ke `UserDashboard.svelte`

- Pada [UserDashboard.svelte](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/UserDashboard.svelte):
  Ketika `activeTab === 'knowledge-base'`, area `<main>` akan me-render `<KnowledgeBaseRoot />`.
- Mendukung direct link URL `/dashboard?tab=knowledge-base` serta navigasi instan saat memilih menu Knowledge Base di sidebar kiri.

---

## 6. Rencana Pengujian Black-Box (UAT)

1. Membuka browser pada route `http://localhost/dashboard?tab=knowledge-base`.
2. Menguji pencarian pada input "Cari judul atau jawaban...".
3. Menguji pergantian sub-tab antara `Entri usaha (4)` dan `Pertanyaan belum terjawab (2)`.
4. Menguji klik tombol `Tambah entri` dan `Buat entri ↗` untuk memastikan modal entri terbuka dengan baik.
5. Memverifikasi tata letak responsif pada desktop dan layar tablet/mobile.
