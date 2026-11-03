# Rencana Implementasi: Fitur Overview (Onboarding Pengguna Baru)

Dokumen ini adalah cetak biru teknis untuk pembangunan halaman **Overview (Onboarding Pertama Kali)** di sisi frontend aplikasi web Meseid (`apps/web`). Fokus utama proyek ini adalah **menghasilkan antarmuka (UI) yang semirip mungkin dengan desain referensi**. Seluruh logika backend, otentikasi rumit, dan guard keamanan data ditunda dan dibiarkan sebagai *stub* sederhana tanpa over-engineering. `UserDashboard.svelte` **tidak diubah** pada fase ini; akses overview dilakukan langsung melalui URL `/overview`.

---

## 1. Ringkasan Fitur

- **Tujuan**: Memberikan alur pengenalan dan konfigurasi awal (onboarding) yang visualnya persis dengan desain referensi bagi pengguna yang baru pertama kali mendaftar.
- **Kapan Tampil**: Tepat **satu kali**, segera setelah registrasi/login pertama kali dan sistem mendeteksi pengguna belum menyelesaikan alur onboarding.
- **Kapan Tidak Tampil**:
  - Pengguna yang sudah menyelesaikan (*completed*) alur onboarding. Desain referensi tidak memiliki tombol "skip", sehingga alur diselesaikan melalui tombol navigasi *Next* / *Submit* hingga layar akhir.
  - Kunjungan berulang (pada fase final nanti diarahkan ke `/dashboard`).
  - Pengunjung yang belum terautentikasi (pada fase final nanti diarahkan ke `/join-us`).
- **Sifat Implementasi**: 100% *Frontend-first* berbasis Svelte 5 Runes dengan lapisan data stub sementara (`overviewService.ts`). Seluruh titik integrasi masa depan ditandai dengan komentar `// TODO(backend)`.

---

## 2. Temuan Eksplorasi Kode & Lingkungan

1. **Framework & Versi**:
   - Svelte: `^5.57.1` (Svelte 5)
   - SvelteKit: `^3.0.0`
   - Bundler: Vite `^8.3.0`
   - TypeScript: `^6.0.3`
2. **Gaya Komponen**:
   - Wajib menggunakan **Svelte 5 Runes** (`$state()`, `$derived()`, `$props()`, `$effect()`).
   - Mode Runes diaktifkan secara global di `vite.config.ts`.
   - Tidak menggunakan top-level `await` di dalam blok `<script>` komponen Svelte; pemanggilan asinkron dilakukan di dalam `onMount` atau *event handler*.
3. **Mode Render & Routing SvelteKit**:
   - Menggunakan `@sveltejs/adapter-static` `^4.0.0` (SPA mode dengan fallback `index.html`).
   - `src/routes/+layout.ts` sudah menetapkan `prerender = true` dan `ssr = false`, sehingga route `/overview` **tidak membutuhkan file `+page.ts` terpisah**. Cukup menyediakan `src/routes/overview/+page.svelte`.
   - Redirect navigasi secara resmi menggunakan `goto()` dari `$app/navigation`.
4. **Sistem Styling & Design Tokens**:
   - Menggunakan Tailwind CSS v4 via `@tailwindcss/vite` yang diimpor di `src/routes/layout.css`.
   - **Nilai Tunggal Hex `brand-utama`**: Ditetapkan persis **`#1ED10E`** sesuai token `--color-brand-utama` pada `layout.css`.
   - Token warna penting lainnya dari `layout.css`:
     - `--color-brand-tombol`: `#5FD068` (Hijau tombol submit, pill WhatsApp, dan tombol Add)
     - `--color-brand-kesalahan`: `#EF4444` (Merah peringatan risiko, link Terms, dan ikon hapus)
     - `--color-brand-latar`: `#FAFAFA`
     - `--color-brand-permukaan`: `#FFFFFF`
     - `--color-brand-teks-utama`: `#111111`
     - `--color-brand-teks-sekunder`: `#6B7280`
     - Warna Telegram (pada tombol desain): Teal `#65BAA9`
5. **Tipografi**:
   - Font utama seluruh teks dan elemen kontrol adalah **`Intel One Mono`** (`font-intel`), menghasilkan gaya visual monospace/typewriter persis di desain referensi. Sudah dimuat dari Google Fonts di `app.html`.
6. **Kondisi Nyata Aset Statis & Keputusan Lokasi**:
   - SvelteKit hanya melayani file statis dari folder `apps/web/static/`.
   - Seluruh aset overview dipindahkan dari `apps/web/public/` ke `apps/web/static/` dan di-track oleh Git:
     - `apps/web/static/svg/overview/` (berisi 9 file SVG)
     - `apps/web/static/img/Botfather.webp`
   - **Keputusan Lokasi & Penamaan `Whatsapp-white.svg` & `Telegram-white.svg`**:
     - `static/svg/Whatsapp.svg` dan `static/svg/Telegram.svg` adalah aset berwarna (ikon hijau & biru gradien) yang secara spesifik digunakan oleh halaman landing (`LandingPage.svelte`).
     - `static/svg/overview/Whatsapp-white.svg` dan `static/svg/overview/Telegram-white.svg` adalah aset khusus dengan garis/isi **putih solid** (`fill="white"`) yang dibuat khusus agar serasi di atas tombol kapsul hijau (`#5FD068`) dan teal (`#65BAA9`).
     - **Keputusan**: Diberi nama pembeda `-white.svg` dan berada di `static/svg/overview/` agar tidak ambigu dan tidak terjadi konflik dengan aset landing page.

---

## 3. Inventaris Aset

Tabel inventaris aset resmi yang digunakan fitur Overview:

| Nama File | Path Publik SvelteKit | Digunakan Pada | Keterangan & Detail Visual |
|---|---|---|---|
| `hello-overview1.svg` | `/svg/overview/hello-overview1.svg` | Step 1 | Robot berdiri di atas ponsel hijau melambaikan tangan "Hi!" |
| `integration-overview2.svg` | `/svg/overview/integration-overview2.svg` | Step 2 | Robot di atas awan menghubungkan Telegram, WhatsApp, web, folder |
| `Whatsapp-white.svg` | `/svg/overview/Whatsapp-white.svg` | Step 2 | Ikon WhatsApp putih solid (khusus tombol pill hijau overview) |
| `Telegram-white.svg` | `/svg/overview/Telegram-white.svg` | Step 2 | Ikon Telegram putih solid (khusus tombol pill teal overview) |
| `Botfather.webp` | `/img/Botfather.webp` | Step 2 (Modal Telegram) | Karakter BotFather di atas pintu terbuka |
| `edit.svg` | `/svg/overview/edit.svg` | Step 3 | Ikon pensil outline hitam untuk edit chip gaya bicara/aturan |
| `trash.svg` | `/svg/overview/trash.svg` | Step 3 | Ikon tong sampah outline merah (`#EF4444`) untuk hapus chip |
| `overview-3-integration-bots.svg` | `/svg/overview/overview-3-integration-bots.svg` | Step 3.1 | Dua robot (robot jas bisnis & robot koki) di atas smartphone |
| `overview-4-ai-reads.svg` | `/svg/overview/overview-4-ai-reads.svg` | Step 4 | Robot melayang membaca lembaran koran dengan tanda tanya |
| `overview-5-ai-loading.svg` | `/svg/overview/overview-5-ai-loading.svg` | Step 5 | Robot di dalam lingkaran cincin progress hijau dengan kilauan |
| `Logo.svg` | `/svg/Logo.svg` | Header Semua Step | Logo resmi Meseid yang dipakai di `OverviewNavbar.svelte` pojok kiri atas |
| Mockup QR Code | Komponen SVG Internal | Step 2 (Modal WhatsApp) | Mockup kode QR hitam tajam berbingkai rounded hijau |

---

## 4. Aturan Kemiripan UI (UI Similarity Protocol)

1. **Inspeksi Visual Sebelum Menulis Kode**:
   - Sebelum mulai mengoding komponen sebuah step, **buka dan baca file gambar PNG referensinya**.
   - Catat checklist detail: ukuran font, warna teks, warna latar, border (tebal & warna), radius sudut, padding, margin, ukuran dan letak ilustrasi, serta jarak antar elemen.
2. **Preservasi Ejaan Persis Sesuai Desain**:
   - Teks pada antarmuka **wajib menyalin teks persis dari desain**, termasuk ejaan tidak baku/typo bawaan desain referensi, antara lain:
     - `"Bussiness"` (Step 4, bukan *Business*)
     - `"Assitance"` (Step 4 & Step 3, bukan *Assistance*)
     - `"Verifty"` (Step 2 OTP, bukan *Verify*)
     - `"Cherfully"` (Step 3, bukan *Cheerfully*)
     - `"procces"` (Step 2 OTP, bukan *process*)
     - `"Unoficial"` (Step 2 WhatsApp Modal, bukan *Unofficial*)
   - **Prinsip Utama: Jika ada perbedaan antara teks/instruksi di dokumen ini dengan gambar PNG referensi, maka gambar PNG yang MENANG.** Selisih wajib dilaporkan.
3. **Pengukuran & Nilai Desain**:
   - Ukur langsung dari gambar referensi; jangan menebak.
   - Prioritaskan token Tailwind yang sudah ada di `layout.css`. Jika tidak tersedia di token, gunakan nilai arbitrary Tailwind yang presisi (misal `text-[32px]`, `bg-[#65BAA9]`) dan catat di dokumen.
4. **Cakupan Lengkap Seluruh Layar**:
   - Seluruh layar modal, state alternatif (seperti pilihan QR vs alur nomor HP + OTP), dan form penambahan data wajib diimplementasikan penuh sesuai PNG yang ada di folder desain.
5. **Verifikasi Perbandingan Visual di Akhir Tiap Tahap**:
   - Di akhir pengerjaan tahap, jalankan dev server (`npm run dev`), buka di browser, dan bandingkan hasil tampilan dengan gambar PNG referensi pada resolusi desktop dan mobile.
   - Laporkan daftar selisih visual yang masih tersisa secara jujur. Dilarang menyatakan "sudah sama persis" tanpa melakukan komparasi nyata.
   - **Kriteria Selesai Tambahan Wajib**: *"Tidak ada selisih visual yang diketahui, atau selisih yang ada telah dicatat transparan di laporan"*.
6. **Interaksi Frontend-Only**:
   - Seluruh data form disimpan di `$state` lokal / draft service sementara tanpa validasi berlebihan di luar yang terlihat pada desain.

---

## 5. Analisis Desain & Checklist Visual Per Langkah

### Step 1: Identitas Diri (`overview1.png`)
- **Header**: Logo Meseid di pojok kiri atas.
- **Ilustrasi**: `hello-overview1.svg`, terpusat di atas judul.
- **Judul**: `Let us Know Who You Are..` (Monospace `font-intel`, warna `#111111`).
- **Input Pill**:
  - Border: `border border-black`, radius `rounded-full` / `rounded-2xl`, tinggi ~54px–60px, lebar max ~520px.
  - Teks Placeholder: `Enter Your Name...` (warna abu-abu `#6B7280`).
  - Sisi Kanan: Karakter panah `→`.
- **Aksi Bawah**:
  - Teks: `→ Next ..` (font-intel, cursor-pointer, efek hover warna hijau `#1ED10E`).

### Step 2: Integrasi Bot Messaging (`overview2.png` & Layar Terkait)
- **Hero**: `integration-overview2.svg`.
- **Judul**: `Let's Connect Your Bots..`
- **Tombol WhatsApp**:
  - Background `#5FD068`, teks putih `Connect WhatsApp`, ikon `/svg/overview/Whatsapp-white.svg`, border radius `rounded-2xl`.
- **Tombol Telegram**:
  - Background `#65BAA9` (teal), teks putih `Connect Telegram`, ikon `/svg/overview/Telegram-white.svg`, border radius `rounded-2xl`.
- **Link Kebijakan**:
  - `Read Our Terms Before starts..📜` (warna merah `#EF4444`, font monospace, emoji 📜).
- **Checkbox Persetujuan**:
  - `Agreed with Policy...` diikuti kotak centang `☑`.
- **Kondisi Blokir Navigasi**:
  - **Tombol `Next →` wajib DIBLOKIR (disabled) sampai checkbox "Agreed with Policy..." dicentang.**
- **Navigasi Bawah**:
  - `← Back   Next →` (terpusat, font monospace).

#### Sub-Alur Modal Telegram (`telegram-popup.png`)
- **Card Modal**: Pop-up putih bersih, `rounded-3xl`, bayangan halus.
- **Judul**: `Say Hello To Telegram Bots!`
- **Gambar**: `/img/Botfather.webp` di tengah.
- **Form**: Label `Type Your Telegram Bots Token`, input pill `Type here ...`.
- **Instruksi Teks Verbatim**:
  ```text
  How to Connect Your Telegram Bot:
  1. Open Telegram and search for the official @BotFather account (look for the verified badge).
  2. Send the /newbot command to initiate bot creation.
  3. Enter your bot's display name (e.g., App Alert Bot).
  4. Enter a unique username that must end with bot (e.g., app_alert_notif_bot).
  5. Copy the HTTP API Token provided in the BotFather confirmation message.
  6. Paste the token into the field below and click Connect.
  ```
- **Tautan**: `→ Read Important Safety !` (warna merah `#EF4444`).
- **Aksi Lanjut**: `→ Click here to continue...` (warna hijau muda `#5FD068`).

#### Sub-Alur Modal WhatsApp (`Whatsapp-popup.png`)
- **Card Modal**: Pop-up putih, `rounded-3xl`.
- **Judul**: `How To Connect Your WhatsApp`
- **Box QR**: Kotak bergaris tepi hijau `border-2 border-[#5FD068]` `rounded-2xl` memuat kode QR mock.
- **Instruksi Teks Verbatim**:
  ```text
  Steps To Connect :
  1. Use a Dedicated Number: We strongly recommend using a fresh/secondary WhatsApp number (specifically intended for admin or bot operations) rather than your personal account.
  2. Open WhatsApp on your phone.
  3. Tap Settings (iOS) or the three dots menu (Android) > Linked Devices.
  4. Tap Link a Device and point your camera at this QR code.
  ```
- **Tautan**: `→ Read API Unoficial Risk!` (warna merah `#EF4444`, verbatim).
- **Banner Risiko**: Kotak merah penuh `bg-[#EF4444]` `rounded-xl`, teks putih:
  `"Understand the risks of unofficial API integration before scanning."` disertai kotak centang putih `⬜`.
- **Aksi Lanjut**: `→ Click here to continue...` (warna hijau muda `#5FD068`).

#### Sub-Alur Alternatif WhatsApp: Nomor HP & OTP (`Overview-2-enter-number.png` & `Overview-2-verifty-otp.png`)
- Tautan switch dari modal QR: *"Or connect using phone number & OTP"*
- Layar Input Nomor: Input pill `Enter Your Number...` dengan panah `→`, teks `Send OTP Code...`.
- Layar Input OTP: Input pill `Verifty OTP here...` (verbatim) dengan panah `→`, teks `Wait procces Until Succeeds..` (verbatim).

### Step 3: Pilihan Awal & Personalisasi Bot (`Overview-3*.png`)
Alur Step 3 dibagi menjadi 3 sub-langkah berurutan (*sequential sub-steps*):
1. **Sub-langkah 3.1: Pilihan Awal (`Overview-3.png`)**
   - Ilustrasi: `overview-3-integration-bots.svg`.
   - Opsi 1: `Setting up your Bots ...` `☑` (Lanjut ke form personalisasi 3.2).
   - Opsi 2: `Use Default Settings ...` `☐` (Langsung melompat ke Step 4 saat Next diklik).
   - Navigasi: `← Back   Next →`.
2. **Sub-langkah 3.2: Personalisasi Asisten Toko (`Overview-3-store-personalize.png`)**
   - Judul: `Personalize Your Store Assistant`.
   - Input pill: `Bot Admin Name : ...`.
   - Card `Choose Speaking Style..`: Chip hijau `Cherfully` (verbatim), `Please Call Me "Tuan Muda"`, `Informative` (masing-masing memiliki ikon edit hitam & trash merah), input penambah aturan dengan tombol `+`.
   - Toggle checkbox: `Add Custom Rules ...` `☑`.
   - Card `Custom Rules...`: Chip hijau `Dont call me Nig`, `Never ask me twice`, `No Racist Word` (dengan ikon edit & trash), input penambah aturan dengan tombol `+`.
   - **Perbedaan Tombol Submit vs Next**:
     - Tombol **Submit** (kapsul hijau di bawah card): Menyimpan chip, nama bot, dan aturan kustom ke state draft. Menampilkan feedback visual bahwa data telah tersimpan.
     - Tombol **Next →** (navigasi di bawah): Memvalidasi draft dan berpindah ke layar berikutnya (Sub-langkah 3.3).
3. **Sub-langkah 3.3: Personalisasi Asisten Pribadi (`Overview-3-assitant-personalize.png`)**
   - Menggunakan komponen reusable yang sama (`Step3PersonalizeForm.svelte`).
   - Judul: `Personalize Your Assistant`.
   - Input pill: `Bot Name : ...`.
   - Card `Choose Speaking Style..` dan card `Custom Rules...` dengan interaksi yang identik.
   - Tombol **Next →** melanjutkan ke Step 4.

### Step 4: Knowledge Base Bisnis AI (`Overview-4*.png`)
- **Layar Pengantar (`Overview-4.png`)**: Ilustrasi `overview-4-ai-reads.svg`, judul verbatim `Let AI Knows Your Bussiness..`, navigasi `← Back   Next →`.
- **Layar Formulir KB (`Overview-4-kb-forms.png`)**: Judul `Knowledge Base AI`, input `Title/Topics...`, `Category...`, textarea `Description`, checkbox verbatim `Only Assitance Bot` `☑`, tombol `Add +` (kapsul hijau), tombol `Submit` (kapsul hijau), navigasi `← Back   Next →`.

### Step 5: Finalisasi & Transisi (`Prepared_to_starts.png`)
- **Ilustrasi**: `overview-5-ai-loading.svg`.
- **Judul**:
  ```text
  Welcome (Users) Just Text it
    We'll do The Books...
  ```
  *(Kata `Users` diganti secara reaktif dengan nama yang diinput pada Step 1).*
- **Indikator**: Teks `Loading...` dengan animasi cincin berputar / loading halus.
- **Aksi Otomatis**: Setelah jeda singkat (~2.5 detik simulasi), memanggil `markOverviewSeen()` dan mengalihkan pengguna ke `/dashboard` via `goto('/dashboard')`.

---

## 6. Pohon File yang Bersih & Terstruktur

```
apps/web/
├─ implementasi.md                                  ← Rencana implementasi teknis
├─ static/
│  ├─ img/
│  │  └─ Botfather.webp                            ← [Dipindahkan dari public/img/]
│  └─ svg/
│     └─ overview/                                 ← [Dipindahkan dari public/svg/overview/]
│        ├─ edit.svg
│        ├─ hello-overview1.svg
│        ├─ integration-overview2.svg
│        ├─ overview-3-integration-bots.svg
│        ├─ overview-4-ai-reads.svg
│        ├─ overview-5-ai-loading.svg
│        ├─ Telegram-white.svg
│        ├─ trash.svg
│        └─ Whatsapp-white.svg
├─ src/
│  ├─ routes/
│  │  └─ overview/
│  │     └─ +page.svelte                           ← [Baru] Route tipis pengimpor OverviewRoot
│  └─ panels/
│     └─ users/
│        └─ overview/
│           ├─ OverviewRoot.svelte                 ← [Baru] Controller alur ($state internal, no URL sync)
│           ├─ overviewService.ts                  ← [Baru] Abstraksi data sementara (SSR safe, default data, try/catch)
│           └─ components/
│              ├─ OverviewNavbar.svelte            ← [Baru] Logo Meseid + dev reset trigger (DEV only)
│              ├─ Step1Name.svelte                 ← [Baru] Step 1: Input nama
│              ├─ Step2ConnectBots.svelte          ← [Baru] Step 2: Hubungkan WhatsApp & Telegram
│              ├─ Step2TelegramModal.svelte        ← [Baru] Modal Telegram BotFather & token
│              ├─ Step2WhatsappModal.svelte        ← [Baru] Modal WhatsApp QR & alur alternatif OTP
│              ├─ Step3Choice.svelte               ← [Baru] Step 3.1: Pilihan Setting up vs Use Default
│              ├─ Step3PersonalizeForm.svelte      ← [Baru] Step 3.2 & 3.3: Form personalisasi reusable
│              ├─ Step4KnowledgeBase.svelte        ← [Baru] Step 4: Intro & form Knowledge Base AI
│              └─ Step5Ready.svelte                ← [Baru] Step 5: "Prepared to starts" & redirect dashboard
```

*(Catatan: `UserDashboard.svelte` dan `JoinUsView.svelte` tidak disentuh pada fase frontend overview ini).*

---

## 7. Desain Arsitektur & Lapisan Data Sementara

### 1. State Controller di `OverviewRoot.svelte`
- Alur langkah dikelola murni menggunakan Runes `$state` tanpa sinkronisasi URL:
  ```svelte
  let currentStep = $state(1); // 1: Name, 2: Bots, 3: Personalize, 4: KB, 5: Ready
  let subStep3 = $state<'choice' | 'store' | 'assistant'>('choice');
  ```

### 2. Layanan Data Sederhana (`overviewService.ts`)
- Memuat definisi `defaultOverviewData` lengkap.
- Pembacaan storage dibungkus try/catch secara aman dari error parsing JSON maupun lingkungan non-browser (SSR safe).

---

## 8. Rencana Kerja Bertahap (7 Tahap)

---

### Tahap 1: Kerangka Route, Service Sementara, dan Placeholder Navigasi
- **Tujuan**: Memindahkan aset ke folder `static/`, membangun route `/overview` (`+page.svelte`), `overviewService.ts` (dengan `defaultOverviewData` dan try/catch), navbar dengan dev reset (`DEV` only), serta kerangka navigasi Back/Next antar placeholder steps.
- **File yang Dibuat/Diubah**:
  - `static/svg/overview/*` & `static/img/Botfather.webp` (Aset dipindahkan dan di-track git)
  - `src/routes/overview/+page.svelte`
  - `src/panels/users/overview/overviewService.ts`
  - `src/panels/users/overview/OverviewRoot.svelte`
  - `src/panels/users/overview/components/OverviewNavbar.svelte`
- **Kriteria Selesai**:
  - [x] Perpindahan aset ke `static/svg/overview/` dan `static/img/Botfather.webp` berhasil dan diverifikasi dapat dimuat.
  - [x] Route `/overview` dapat dibuka langsung di browser.
  - [x] State `$state(currentStep)` berpindah dari Step 1 hingga Step 5 dengan navigasi Back/Next.
  - [x] Navigasi redirect menggunakan `goto()` dari `$app/navigation`.
  - [x] Tombol dev reset hanya tampil saat `import.meta.env.DEV === true`.
  - [x] Tidak ada top-level `await` di script komponen.
  - [x] `UserDashboard.svelte` tidak diubah sama sekali.
  - [x] `npm run check` lolos dengan 0 error dan 0 warning.
- **Cara Menguji**:
  - Buka `http://localhost:5173/overview` -> klik Next/Back untuk memverifikasi alur state.
  - Klik "Reset Onboarding (Dev)" -> data draft terhapus bersih.
- **Status**: `[x] selesai`

---

### Tahap 2: Implementasi Detail Step 1 (Identitas & Nama)
- **Tujuan**: Membangun tampilan Step 1 identik dengan `overview1.png`.
- **File yang Dibuat/Diubah**:
  - `src/panels/users/overview/components/Step1Name.svelte`
  - `src/panels/users/overview/OverviewRoot.svelte`
- **Kriteria Selesai**:
  - [x] Ilustrasi `hello-overview1.svg` ditampilkan presisi di tengah.
  - [x] Judul `Let us Know Who You Are..` menggunakan font `Intel One Mono`.
  - [x] Input pill memiliki border hitam, placeholder `Enter Your Name...`, dan panah `→`.
  - [x] Teks `→ Next ..` berfungsi memicu perpindahan ke Step 2 dan menyimpan nama ke draft.
  - [x] Dilakukan komparasi visual dengan `overview1.png` pada viewport desktop dan mobile.
  - [x] Tidak ada selisih visual yang diketahui, atau selisih tercantum di laporan.
  - [x] `npm run check` lolos dengan 0 error dan 0 warning.
- **Cara Menguji**:
  - Masukkan nama pada input pill -> tekan Enter atau klik Next -> nama tersimpan di draft.
- **Status**: `[x] selesai`

---

### Tahap 3: Implementasi Detail Step 2 (Integrasi WhatsApp & Telegram + 2 Modal)
- **Tujuan**: Membangun tampilan Step 2 identik dengan `overview2.png`, modal Telegram (`telegram-popup.png`), modal WhatsApp QR (`Whatsapp-popup.png`), serta opsi alternatif nomor telepon & OTP (`Overview-2-enter-number.png` & `Overview-2-verifty-otp.png`).
- **File yang Dibuat/Diubah**:
  - `src/panels/users/overview/components/Step2ConnectBots.svelte`
  - `src/panels/users/overview/components/Step2TelegramModal.svelte`
  - `src/panels/users/overview/components/Step2WhatsappModal.svelte`
- **Kriteria Selesai**:
  - [x] Tombol "Connect WhatsApp" (`#5FD068`) dan "Connect Telegram" (`#65BAA9`) sesuai visual desain.
  - [x] Tautan merah `Read Our Terms Before starts..📜` dan checkbox `Agreed with Policy...`.
  - [x] **Tombol `Next →` wajib dinonaktifkan (disabled / unclickable) sampai checkbox "Agreed with Policy..." dicentang.**
  - [x] Modal Telegram menampilkan gambar `Botfather.webp`, instruksi 1–6 verbatim, input token, link merah, dan tombol lanjut hijau.
  - [x] Modal WhatsApp menampilkan QR box hijau, instruksi 1–4, link merah `"→ Read API Unoficial Risk!"` (verbatim), banner merah persetujuan risiko, serta link beralih ke alur nomor telepon & OTP.
  - [x] Alur nomor telepon & OTP memuat teks verbatim `"Verifty OTP here..."` dan `"Wait procces Until Succeeds.."`.
  - [x] Dilakukan komparasi visual dengan seluruh PNG referensi Step 2 (PNG menang jika ada perbedaan ejaan/teks).
  - [x] Tidak ada selisih visual yang diketahui, atau selisih tercantum di laporan.
  - [x] `npm run check` lolos dengan 0 error dan 0 warning.
- **Cara Menguji**:
  - Sebelum mencentang kebijakan: amati tombol Next tidak dapat diklik.
  - Centang kebijakan: tombol Next aktif.
  - Buka modal Telegram dan WhatsApp, periksa kelengkapan tampilan.
- **Status**: `[x] selesai`

---

### Tahap 4: Implementasi Detail Step 3 (Layar Pilihan Awal & Form Personalisasi Reusable)
- **Tujuan**: Membangun alur Step 3 berurutan: Layar Pilihan Awal (`Overview-3.png`), lalu Form Personalisasi Asisten Toko (`Overview-3-store-personalize.png`), lalu Form Personalisasi Asisten Pribadi (`Overview-3-assitant-personalize.png`) menggunakan komponen reusable `Step3PersonalizeForm.svelte`.
- **File yang Dibuat/Diubah**:
  - `src/panels/users/overview/components/Step3Choice.svelte`
  - `src/panels/users/overview/components/Step3PersonalizeForm.svelte`
  - `src/panels/users/overview/OverviewRoot.svelte`
- **Kriteria Selesai**:
  - [x] Layar pilihan awal memuat ilustrasi `overview-3-integration-bots.svg` dan dua opsi checkbox sesuai `Overview-3.png`.
  - [x] Memilih "Use Default Settings ..." langsung melanjutkan ke Step 4 saat Next diklik.
  - [x] Memilih "Setting up your Bots ..." melanjutkan ke form Toko, kemudian lanjut ke form Asisten Pribadi.
  - [x] Komponen `Step3PersonalizeForm.svelte` menerima props `type: 'store' | 'assistant'` dan merender judul persis (`Personalize Your Store Assistant` / `Personalize Your Assistant`).
  - [x] Chip hijau memuat teks verbatim (`Cherfully`, `Please Call Me "Tuan Muda"`, dll.) lengkap dengan ikon edit pensil hitam dan hapus tong sampah merah.
  - [x] Penambahan aturan baru via input pill dan tombol `+` berfungsi di tingkat frontend.
  - [x] Toggle `Add Custom Rules ...` menampilkan card kedua aturan kustom.
  - [x] **Tombol Submit menyimpan chip dan nama bot ke draft storage; tombol Next berpindah ke layar berikutnya.**
  - [x] Dilakukan komparasi visual dengan ketiga PNG referensi Step 3 (PNG menang jika ada perbedaan).
  - [x] Tidak ada selisih visual yang diketahui, atau selisih tercantum di laporan.
  - [x] `npm run check` lolos dengan 0 error dan 0 warning.
- **Cara Menguji**:
  - Pilih kustomisasi -> isi nama bot toko -> tambah chip aturan -> klik **Submit** (draft tersimpan) -> klik **Next →** (layar berpindah ke asisten pribadi) -> isi asisten pribadi -> klik **Next →** (berpindah ke Step 4).
- **Status**: `[x] selesai`

---

### Tahap 5: Implementasi Detail Step 4 (Knowledge Base Bisnis AI)
- **Tujuan**: Membangun tampilan pengantar `Overview-4.png` dan formulir Knowledge Base `Overview-4-kb-forms.png`.
- **File yang Dibuat/Diubah**:
  - `src/panels/users/overview/components/Step4KnowledgeBase.svelte`
- **Kriteria Selesai**:
  - [x] Layar pengantar menampilkan ilustrasi `overview-4-ai-reads.svg` dan judul verbatim `Let AI Knows Your Bussiness..`.
  - [x] Formulir KB memuat judul `Knowledge Base AI`, input `Title/Topics...`, `Category...`, textarea `Description`, dan checkbox verbatim `Only Assitance Bot`.
  - [x] Tombol `Add +` menambahkan entri ke list sementara secara reaktif; tombol `Submit` menyimpan data ke draft service; tombol `Next →` melanjutkan ke Step 5.
  - [x] Dinamis multi-card Knowledge Base: tombol `Add +` menambahkan kartu form baru secara visual, dengan ikon hapus tong sampah (trash bin) saat terdapat 2 kartu atau lebih.
  - [x] Dilakukan komparasi visual dengan `Overview-4.png` dan `Overview-4-kb-forms.png` (PNG menang jika ada perbedaan).
  - [x] Tidak ada selisih visual yang diketahui, atau selisih tercantum di laporan.
  - [x] `npm run check` lolos dengan 0 error dan 0 warning.
- **Cara Menguji**:
  - Buka Step 4 -> amati intro -> lanjut ke form KB -> isi topik dan deskripsi -> klik Add + -> klik Submit -> klik Next -> lanjut ke Step 5.
- **Status**: `[x] selesai`

---

### Tahap 6: Implementasi Detail Step 5 (Layar Final "Prepared to Starts" & Redirect)
- **Tujuan**: Membangun layar penutup identik dengan `Prepared_to_starts.png`, robot loading spinner, ucapan selamat datang dinamis, dan redirect otomatis ke dashboard.
- **File yang Dibuat/Diubah**:
  - `src/panels/users/overview/components/Step5Ready.svelte`
  - `src/panels/users/overview/OverviewRoot.svelte`
- **Kriteria Selesai**:
  - [x] Ilustrasi `overview-5-ai-loading.svg` ditampilkan dengan animasi cincin berputar / loading halus.
  - [x] Teks ucapan menampilkan nama dinamis dari Step 1:
    ```text
    Welcome [Nama Pengguna] Just Text it
      We'll do The Books...
    ```
  - [x] Teks `Loading...` di bawah judul.
  - [x] Setelah jeda timer 2.5 detik, fungsi `markOverviewSeen()` dieksekusi dan navigasi berpindah ke dashboard via `goto('/dashboard')`.
  - [x] Dilakukan komparasi visual dengan `Prepared_to_starts.png`.
  - [x] **Tidak ada selisih visual yang diketahui, atau selisih tercantum di laporan.**
  - [x] `npm run check` lolos dengan 0 error dan 0 warning.
- **Cara Menguji**:
  - Masuk ke Step 5 -> periksa nama pengguna pada teks sambutan -> biarkan 2.5 detik -> otomatis dialihkan ke `/dashboard`.
- **Status**: `[x] selesai`

---

### Tahap 7: Polish Visual, Audit Responsivitas Mobile/Desktop, & Verifikasi Penuh
- **Tujuan**: Menginspeksi seluruh alur dari Step 1 hingga Step 5 pada breakpoint mobile (360px–414px), tablet, dan desktop (>1024px), memastikan seluruh font dan transisi konsisten, serta uji build final.
- **File yang Dibuat/Diubah**:
  - `src/panels/users/overview/**/*.svelte`
- **Kriteria Selesai**:
  - [x] Tidak ada elemen terpotong, overflow horizontal, atau teks yang bertumpuk di layar mobile.
  - [x] Seluruh font monospace konsisten menggunakan `Intel One Mono`.
  - [x] Semua modal tertutup dengan baik saat backdrop diklik atau tombol continue ditekan.
  - [x] Hasil `npm run check` lolos 0 error dan 0 warning.
  - [x] Hasil `npm run build` sukses 100% tanpa kendala bundling.
- **Cara Menguji**:
  - Uji alur lengkap dari awal sampai akhir di dev server dan production preview (`npm run preview`).
- **Status**: `[x] selesai`

---

## 9. Daftar Titik Sambungan Backend (TODO Backend)

Rangkuman titik sambungan API masa depan (ditandai dengan komentar `// TODO(backend)` pada kode):

| No | Lokasi File | Fungsi / Komponen | Rencana API Backend Masa Depan |
|---|---|---|---|
| 1 | `src/panels/users/overview/overviewService.ts` | `isOverviewCompleted()` | `GET /api/user/onboarding-status` |
| 2 | `src/panels/users/overview/overviewService.ts` | `markOverviewSeen()` | `POST /api/user/onboarding-complete` |
| 3 | `src/panels/users/overview/components/Step2TelegramModal.svelte` | Input Token BotFather | `POST /api/integrations/telegram/verify-token` |
| 4 | `src/panels/users/overview/components/Step2WhatsappModal.svelte` | Scan QR / Input OTP | `GET /api/integrations/whatsapp/qr` & `POST /api/integrations/whatsapp/otp` |
| 5 | `src/panels/users/overview/components/Step3PersonalizeForm.svelte` | Simpan Persona Bot | `POST /api/bots/personalize` |
| 6 | `src/panels/users/overview/components/Step4KnowledgeBase.svelte` | Simpan Knowledge Base | `POST /api/knowledge-base/batch` |
| 7 | `src/panels/users/UserDashboard.svelte` | Guard Masuk Dashboard (ditunda) | Flag `onboarding_completed` pada respons sesi `/api/auth/me` |
| 8 | `src/panels/landing/JoinUsView.svelte` | Redirect Pasca Login Google | Redirect ke `/overview` jika akun baru |

---

## 10. Catatan Keputusan Desain & Teknis

1. **Aset Statis**: File SVG dan gambar berada di `static/` dan di-track git. Ikon putih solid khusus overview bernama `Whatsapp-white.svg` dan `Telegram-white.svg` di `static/svg/overview/`.
2. **Step 3 Persona**: Menggunakan satu komponen reusable `Step3PersonalizeForm.svelte` yang dieksekusi secara berurutan untuk asisten toko lalu asisten pribadi. Tombol Submit untuk menyimpan chip, Next untuk berpindah layar.
3. **Metode WhatsApp**: QR Code dijadikan tampilan utama modal WhatsApp, dengan tombol tautan beralih ke alur nomor HP dan OTP sebagai alternatif. Tombol Next di Step 2 diblokir sampai persetujuan dicentang.
4. **Dev Tools**: Tombol Reset Onboarding diproteksi ketat menggunakan `import.meta.env.DEV` agar tidak aktif pada build produksi.
5. **Navigasi SvelteKit**: Seluruh perpindahan halaman menggunakan `goto()` dari `$app/navigation` tanpa top-level `await`. `UserDashboard.svelte` tidak disentuh sama sekali pada fase ini.
