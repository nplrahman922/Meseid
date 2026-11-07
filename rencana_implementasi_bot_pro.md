# Rencana Implementasi & Evaluasi Model AI untuk Akun Pro Meseid

Dokumen ini merupakan catatan strategis dan hasil evaluasi teknis pengujian langsung (*live testing*) mengenai rencana penambahan model AI mutakhir (selain Nemotron Free) untuk pengguna **Akun Pro** di platform Meseid.

---

## 1. Arsitektur Database: "Konfigurasi Dinamis" vs "Hardcoded Code"

### A. Keputusan Skema Database
- **TIDAK PERLU Tabel Khusus `bot_pro_configs`:**
  Membuat tabel terpisah untuk akun Pro adalah *anti-pattern* yang merusak normalisasi database dan menyulitkan sistem saat akun mengalami siklus *upgrade* atau *downgrade*.
- **Penyimpanan Konfigurasi Tenant:**
  Tetap terpusat di tabel `bot_configs` melalui kolom `selected_model_id text` yang terikat multi-tenant RLS per `owner_id`.
- **Database-Driven Model Parameter (Menggantikan Hardcoded TypeScript):**
  Alih-alih menaruh `temperature`, `max_tokens`, `prompt_style`, dan `confidence_threshold` di kode TypeScript ([model-profiles.registry.ts](apps/api/src/adapters/ai/eval/model-profiles.registry.ts)), parameter tersebut direncanakan untuk disimpan langsung di tabel **`ai_models.config` (JSONB)**.
  
  *Manfaat:* Admin dapat menyetel sensitivitas/tuning model atau menambah model Pro baru langsung via database tanpa perlu kompilasi dan *restart/redeploy* server.

---

## 2. Strategi Batasan Token (*Token Capping & Safety Ceiling*)

Berdasarkan pengujian nyata, batasan token lama (**800 token**) terbukti **terlalu sempit** untuk dokumen bisnis (teks terpotong), sedangkan batas **10.000 token** terlalu berisiko boros biaya jika model mengalami *looping*.

### Rekomendasi Solusi Token Capping:
1. **Sweet Spot 3.000 – 5.000 Token:**
   - Memberi ruang 500 – 1.000 token untuk penalaran internal (*reasoning/thinking tokens*).
   - Memberi ruang 2.500 – 4.000 token untuk hasil akhir draf dokumen panjang tanpa terpotong.
2. **Hard Safety Ceiling (Circuit Breaker):**
   Menerapkan batas pengaman maksimal 5.000 token pada *Gateway Client* (`Math.min(requestedTokens, 5000)`) agar tagihan API Vercel tidak pernah membengkak (*bill-shock protection*).
3. **Alokasi Dinamis Berdasarkan Tugas:**
   - Chat Teks Singkat / Q&A Toko: Max **1.000 token**.
   - Ekstraksi Nota / Foto OCR: Max **3.000 token**.
   - Pembuatan Dokumen / SOP / Legal / Coding: Max **5.000 token**.

---

## 3. Klasifikasi Model AI Teruji di Vercel AI Gateway

Dari total 499 model yang tersedia di Vercel AI Gateway (menggunakan API Key aktif proyek), berikut adalah model-model unggulan yang telah teruji:

### A. VLM (Vision-Language Models) untuk Akun Pro
Model yang mampu memproses pasangan **Teks + Gambar / Foto Nota (OCR)**:
1. **`google/gemini-2.5-flash` (Flagship All-Rounder):**
   - *Kelebihan:* Sangat cepat (~2.6 detik), hemat biaya, memiliki penalaran kuat (*thinking engine*), dan *Context Window* raksasa **1 Juta Token**.
   - *Biaya:* In: $0.30 / 1M token, Out: $2.50 / 1M token.
2. **`openai/gpt-4o` (Standar Industri Bisnis):**
   - *Kelebihan:* Format tabel paling presisi, ekstraksi nota belanja beresolusi rendah sangat akurat, kecepatan tinggi (~1.3 detik).
   - *Biaya:* In: $2.50 / 1M token, Out: $10.00 / 1M token *(Varian hemat `gpt-4o-mini`: In: $0.15, Out: $0.60)*.
3. **`perplexity/sonar` (VLM Khusus Web Search):**
   - *Kelebihan:* Mampu membaca foto/gambar (VLM) sekaligus menjelajah internet secara otonom untuk data real-time terkini.

### B. LMM Native Audio (Model Multimodal Suara Langsung)
1. **`xiaomi/mimo-v2.6-flash` / `mimo-v2.6-pro`:**
   - *Kelebihan Langka:* Memiliki input bawaan `["text", "audio", "image", "video"]`. Dapat menerima file suara (*Voice Note*) secara langsung bersama teks dan foto dalam satu model.
   - *Kelemahan:* Belum memiliki peramban web bawaan.

### C. Web Searching Capabilities (Pencarian Real-Time)
- **`google/gemini-2.5-flash`** & **`openai/gpt-4o`**: Sudah memiliki integrasi *web-search* dan *tool-use*. Saat ditanya info terkini (seperti kurs mata uang atau berita hari ini), model otomatis memicu pencarian internet.
- **`perplexity/sonar`**: Menjelajah web secara mandiri dan mengembalikan jawaban real-time lengkap dengan sitasi sumber.

---

## 4. Evaluasi Khusus: AI Pembuat Dokumen Berkecepatan & Berakurasi Tinggi

Berdasarkan pengujian draf *SOP Penanganan Komplain & Pengembalian Barang Rusak*:

1. **`anthropic/claude-sonnet-4.5` (Juara #1 Pembuat Dokumen):**
   - Menghasilkan draf dokumen sepanjang **6.002 karakter** (2.500 token output).
   - Tata bahasa Indonesia korporat paling formal, elegan, dan berwibawa.
   - Struktur dokumen lengkap: Tabel Header Dokumen, Bab Pendahuluan, Tabel Alur 5 Langkah (Penanggung Jawab, Durasi, Tindakan), Tabel Kriteria Retur, dan Surat Pernyataan Cetak.
2. **`openai/gpt-4o` (Dokumen Cepat & Ringkas):**
   - Menghasilkan draf 2.877 karakter hanya dalam waktu **5,6 detik** (740 token output).
   - Sangat cocok untuk invoice, nota dinas, dan ringkasan eksekutif cepat.
3. **`google/gemini-2.5-pro` (Dokumen Skala Raksasa):**
   - Ideal untuk merangkum puluhan invoice / laporan keuangan bulanan sekaligus menjadi 1 dokumen induk berkat konteks 1 juta token.

---

## 5. Hasil Pengujian: Kemampuan Menghasilkan Berbagai Format File

Dari hasil pengujian terhadap model dokumen (`Claude Sonnet 4.5` dan `OpenAI GPT-4o`), model AI mampu menghasilkan 4 format dokumen bisnis melalui metode-metode berikut:

### A. File Excel (`.xlsx` / `.csv`)
- **Metode 1 (Data Tabular CSV):**
  Model mampu menghasilkan format teks `.csv` / `.tsv` lengkap dengan **formula matematika aktif** seperti `=SUM(B2:B31)`, `=AVERAGE(...)`, dan perkalian otomatis `=D7*E7`. File ini dapat langsung dibuka di Microsoft Excel atau diimpor ke Google Sheets.
- **Metode 2 (File Biner `.xlsx` via Python Script):**
  Model mampu menulis script otomatis menggunakan library `openpyxl` atau `pandas` untuk menyusun file `.xlsx` dengan tata letak profesional: pewarnaan header tabel (*fill color*), garis batas (*border*), pemformatan mata uang (*accounting format Rp*), dan *auto-fit* lebar kolom.

### B. File Dokumen Word (`.docx`) & Google Docs
- **Metode 1 (Format Markdown / Rich-Text Kompatibel):**
  Model menyusun dokumen dengan hirarki judul standar (`Heading 1`, `Heading 2`, `Bullet Points`, dan `Markdown Tables`). Format ini **100% kompatibel dan langsung rapi** saat di-*copy-paste* ke Google Docs atau Microsoft Word tanpa merusak tata letak.
- **Metode 2 (File `.docx` via Script `python-docx`):**
  Model mampu menghasilkan kode pembentuk file `.docx` siap unduh lengkap dengan margin halaman, penomoran halaman otomatis, dan font korporat (seperti Calibri / Arial).

### C. File PDF Resmi (`.pdf`)
- **Metode Print-Ready HTML & CSS:**
  Model mampu menghasilkan kode HTML dengan styling `@media print` khusus dokumen formal (pengaturan ukuran kertas A4, margin 2.5cm, garis kop surat, dan *page-break-inside: avoid* untuk tabel). Kode ini dapat langsung dikonversi menjadi file PDF resmi menggunakan *headless converter* (seperti Puppeteer, Chromium, atau fitur Print to PDF bawaan browser).

---

## 6. Rekomendasi 3 Kandidat Model Final untuk Akun Pro Meseid

| Peran di Akun Pro | Model Pilihan | Alasan Pemilihan |
| :--- | :--- | :--- |
| **1. Asisten Multimodal & Harian** | **`google/gemini-2.5-flash`** | Sangat cepat, hemat biaya, konteks 1 juta token, pintar, dan mampu membaca foto struk belanja / OCR nota dengan akurat. |
| **2. Spesialis Dokumen & Legal Bisnis** | **`anthropic/claude-sonnet-4.5`** | Menghasilkan dokumen resmi (SOP, kontrak, proposal, surat retur, format Word/Excel/PDF) dengan tingkat presisi dan tata bahasa terbaik di dunia. |
| **3. Riset Pasar & Web Search Real-Time** | **`perplexity/sonar`** *(atau `openai/gpt-4o`)* | Mengakses internet secara otonom untuk memantau harga pasar terkini, kurs USD real-time, tren kompetitor, dan berita bisnis hari ini. |

*(Catatan: Untuk Voice Note audio WhatsApp/Telegram, seluruh model di atas dapat dihubungkan secara mulus dengan modul transkripsi `openai/whisper-1` yang biayanya super murah sekitar Rp 1 per menit).*
