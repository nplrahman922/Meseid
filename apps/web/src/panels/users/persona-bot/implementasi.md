# Rencana Implementasi: Halaman Persona Bot (`Persona Bot`)

Dokumen ini adalah cetak biru teknis untuk pembangunan antarmuka pengguna (UI) halaman **Persona Bot** pada `apps/web`. Dokumen ini mencakup perbaikan terhadap anomali visual pada desain referensi, penerapan prinsip arsitektur [AGENTS.md](file:///d:/Project-Sync-Enbee/meseid/AGENTS.md), serta integrasi data dengan tabel PostgreSQL `bot_configs` dan `ai_models`.

---

## 1. Ringkasan Fitur & Perbaikan Masalah Desain

### A. Fitur Halaman:
1. **Konfigurasi Identitas & Gaya Bicara Bot**: Pengaturan nama bot, pilihan nada bicara (*Ramah & praktis*, *Formal*, *Santai*), pesan sapaan awal pelanggan, dan instruksi khusus (*system prompt directives*).
2. **Pratinjau Percakapan Live (*Live Chat Preview*)**: Simulasi percakapan WhatsApp interaktif yang nama dan sapaannya langsung berubah mengikuti input pengguna secara *real-time*.
3. **Pemilihan Mesin AI (*AI Model Selection*)**: Dasbor pemilihan model AI yang digunakan oleh bot (misal: Qwen 3.6, Kimi K3, reflection/beem-free).

### B. Perbaikan Masalah Visual & Logika (Hasil Audit):
1. **Koreksi Status Switch Terbalik**:
   - Pada mockup referensi, switch ON berlabel *"Disable"* dan switch OFF berlabel *"Active"*.
   - **Perbaikan**: Baris yang aktif/terpilih (switch hijau) diberi status **`Aktif`**, sedangkan baris yang mati (switch abu-abu) diberi status **`Nonaktif`**.
2. **Penerapan Logika Single-Select (*1 Dipilih*)**:
   - Karena `bot_configs.selected_model_id` menampung 1 model aktif dan header tabel bertuliskan `1 dipilih`, interaksi switch bersifat eksklusif: menyalakan satu model otomatis menonaktifkan model lainnya.
3. **Penyempurnaan Istilah Terminologi**:
   - Judul tabel diubah dari rancu *"List Bot Provider"* menjadi **"Daftar Model AI"**.
   - Footer tabel diubah dari *"3 dari 28 Bot"* menjadi **"3 dari 28 Model AI · Oktober 2026"**.

---

## 2. Struktur Modul & Dekomposisi Berkas (Kepatuhan Penuh AGENTS.md)

Sesuai aturan baku **"1 Berkas = 1 Fungsi Operasi"** dan batas baris berkas (ideal 30–150 baris, batas keras < 400 baris), halaman Persona Bot dipecah secara modular di bawah `apps/web/src/panels/users/persona-bot/`:

```
apps/web/src/panels/users/persona-bot/
├── PersonaBotRoot.svelte              <- [Container Utama / Koordinator Tab Persona] (± 80 baris)
├── persona-bot.types.ts               <- [Tipe Data & Kontrak Antarmuka Persona] (± 50 baris)
├── implementasi.md                    <- [Dokumen Rencana Teknis ini]
└── components/
    ├── PersonaBotHeader.svelte        <- [Header Judul, Subtitle, dan Garis Slider] (± 45 baris)
    ├── BotGreetingForm.svelte         <- [Formulir Nama Bot, Nada Bicara, Sapaan, & Arahan] (± 130 baris)
    ├── ChatPreviewCard.svelte         <- [Kartu Pratinjau Percakapan WhatsApp Live] (± 110 baris)
    └── AiModelSelectionCard.svelte    <- [Kartu Pemilihan Model AI & Tabel Single-Select] (± 140 baris)
```

---

## 3. Rincian Komponen & Desain Visual

### 1. `PersonaBotHeader.svelte`
- Judul: `Persona Bot` (`font-intel`).
- Subtitle 1: `Buat asisten yang terdengar seperti usaha Anda.`
- Subtitle 2: `Data contoh · {businessName} · {role} · {dateText}`.
- Divider bar: Garis horizontal hijau tipis dengan lingkaran penanda di kedua ujungnya.

### 2. `BotGreetingForm.svelte` (Formulir Personalisasi)
- **Nama bot**: Input teks dengan default `"Rini"` (keterangan: *Nama yang muncul di percakapan pelanggan*).
- **Nada bicara**: Segmented buttons (`Ramah & praktis` [aktif], `Formal`, `Santai`) dengan keterangan penjelasan nada bicara.
- **Pesan sapaan**: Textarea sapaan pembuka bot.
- **Arahan tambahan**: Textarea petunjuk khusus (misal: penggunaan bahasa sehari-hari, larangan menebak info yang belum ada di KB).
- **Tombol Simpan**: `Simpan persona` (hijau `#1ED10E`, rounded-xl) dengan notifikasi status tersimpan.

### 3. `ChatPreviewCard.svelte` (Pratinjau Chat Interaktif)
- Notice box hijau: `Contoh statis · WhatsApp · Mengikuti isian di samping / di atas.`
- Bubble chat WhatsApp:
  - **Bubble 1 (Bot)**: Menampilkan nama bot dan teks sapaan dinamis yang sinkron dengan form di sampingnya.
  - **Bubble 2 (Pelanggan)**: Pertanyaan simulasi (*"Teh original berapa? Hari ini buka sampai jam berapa?"*).
  - **Bubble 3 (Bot)**: Jawaban simulasi berbasis Knowledge Base (*"Teh original Rp 5.000 per gelas..."*).
- Footnote: `Sumber jawaban: Teh original & Jam buka warung di Knowledge Base. Persona tidak mengubah harga atau jadwal.`

### 4. `AiModelSelectionCard.svelte` (Pemilihan Mesin AI)
- **Switch Global**: `Pilih Bot secara Otomatis` (Nonaktif / Aktif).
- **Tabel Daftar Model AI**:
  - Header: **"Daftar Model AI"** dengan counter dinamis **"1 dipilih"**.
  - Kolom: `Status` | `Nama Model` | `Jenis` | `Tipe`.
  - Baris Data:
    1. `Qwen 3.6` (Switch ON, Status: **`Aktif`**, Jenis: `Berbayar`, Tipe: `LLM`).
    2. `Kimi K3` (Switch OFF, Status: **`Nonaktif`**, Jenis: `Berbayar`, Tipe: `LMM`).
    3. `reflection/beem-free` (Switch OFF, Status: **`Nonaktif`**, Jenis: `Gratis`, Tipe: `VLM`).
  - Interaksi: Mengklik salah satu switch akan mengaktifkan model tersebut dan menonaktifkan model yang lain (eksklusif single-select).
  - Footer: `3 dari 28 Model AI · Oktober 2026` dengan navigasi `Sebelumnya` & `Berikutnya`.

---

## 4. Pemetaan Tabel Basis Data (Database Mapping)

| Elemen UI Persona Bot | Tabel / Kolom PostgreSQL Sumber | File Migrasi |
|---|---|---|
| Nama Bot | `bot_configs.admin_bot_name` | `002_tenancy.sql` |
| Sapaan & Arahan | `bot_configs.admin_persona_prompt`, `persona_prompt` | `002_tenancy.sql` |
| Model AI Terpilih | `bot_configs.selected_model_id` (FK ke `ai_models.model_id`) | `002_tenancy.sql`, `012_ai_usage.sql` |
| Jenis Model (Gratis/Berbayar) | `ai_models.tier` (`free` vs `pro`) | `012_ai_usage.sql` |
| Provider / Vendor Model | `ai_models.provider` | `012_ai_usage.sql` |

---

## 5. Integrasi ke `UserDashboard.svelte`

- Pada [UserDashboard.svelte](file:///d:/Project-Sync-Enbee/meseid/apps/web/src/panels/users/UserDashboard.svelte):
  Ketika `activeTab === 'persona-bot'`, area `<main>` akan me-render `<PersonaBotRoot />`.
- Mendukung direct link URL `/dashboard?tab=persona-bot` dan navigasi instan lewat tab Persona Bot di sidebar kiri.

---

## 6. Rencana Pengujian Black-Box (UAT)

1. Membuka browser pada route `http://localhost/dashboard?tab=persona-bot`.
2. Mengetik nama bot baru atau sapaan baru pada form kiri, lalu memverifikasi bahwa bubble chat di kartu pratinjau kanan langsung berubah secara instan (*live reactive*).
3. Menguji pergantian nada bicara (*Ramah & praktis*, *Formal*, *Santai*).
4. Mengklik switch pada baris `Kimi K3` atau `reflection/beem-free` dan memverifikasi bahwa statusnya berubah menjadi **`Aktif`**, model sebelumnya otomatis menjadi **`Nonaktif`**, dan counter tetap menunjukkan `1 dipilih`.
5. Memverifikasi tidak ada label rancu *"Disable"* pada switch yang menyala.
