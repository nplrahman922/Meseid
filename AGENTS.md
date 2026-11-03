# Aturan Arsitektur & Prinsip Kode Proyek Meseid

Dokumen ini berisi aturan baku dan prinsip arsitektur yang **WAJIB** dipatuhi dalam setiap pembuatan, modifikasi, dan refactoring kode di masa mendatang pada proyek Meseid.

---

## 1. Prinsip "1 Berkas = 1 Fungsi Operasi" (File-Level SRP / Action-Based)
Terutama pada kode backend (`apps/api` dan `apps/bot`), **DILARANG KERAS** menggabungkan operasi multi-task atau seluruh siklus CRUD ke dalam satu file model/controller/service raksasa.

### Aturan Baku:
1. **Pemisahan Operasi CRUD:**
   - Setiap operasi spesifik seperti *Create*, *Read/Get*, *List*, *Update*, *Delete*, *Clean Sync*, atau *Verify* harus memiliki berkas mandiri.
   - Contoh struktur modul:
     ```
     modules/<domain>/
     ├── actions/
     │   ├── create-<entity>.action.ts
     │   ├── read-<entity>.action.ts
     │   ├── list-<entity>.action.ts
     │   ├── update-<entity>.action.ts
     │   ├── delete-<entity>.action.ts
     │   └── sync-<entity>.action.ts
     ├── controllers/
     │   ├── create-<entity>.controller.ts
     │   ├── read-<entity>.controller.ts
     │   ├── list-<entity>.controller.ts
     │   ├── update-<entity>.controller.ts
     │   └── delete-<entity>.controller.ts
     ├── <domain>.types.ts
     └── index.ts
     ```
2. **Pemisahan Pipeline Kompleks (Chat Engine & AI Adapter):**
   - Service yang kompleks dilarang menjadi *God Object*. Wajib dipecah menjadi modul pipeline terfokus (misal: `memory-window.reader.ts`, `context-builder.ts`, `primary-generator.ts`, `guardrail-auditor.ts`, `discussion-orchestrator.ts`, `message-persister.ts`).
   - File service utama (`chat.service.ts` atau `ai.adapter.ts`) hanya berfungsi sebagai *pipeline runner / coordinator facade* dengan panjang < 100 baris.
3. **Pemisahan Gateway Bot (`apps/bot`):**
   - Modul bot wajib memisahkan `session/` (lifecycle), `auth/` (Redis sync), `events/` (QR & connection handler), dan `dispatch/` (debouncing & typing pacer).

---

## 2. Batas Ukuran Berkas (*File Line Limits*)
- **Target Ideal:** 30 – 150 baris per file.
- **Batas Keras:** Tidak ada file yang melebihi **400 baris** di seluruh codebase (`apps/api`, `apps/bot`, maupun `apps/web`).

---

## 3. Ketentuan Lingkungan & Database
1. **Mode Produksi Database Murni:** Tidak menggunakan mode *development bypass* melalui `.env`. Seluruh konfigurasi dan identitas bot harus dibaca secara riil dari tabel PostgreSQL (`owners`, `bot_configs`, `channel_connections`, `knowledge_base`).
2. **Multi-Tenant RLS Compliance:** Setiap query mutlak memfilter data berdasarkan `owner_id`.
3. **100% Free-Tier AI Models:** Menggunakan model gratis dari Vercel AI Gateway / OpenRouter dengan fallback dinamis dan Guardrail Validator sekunder.
