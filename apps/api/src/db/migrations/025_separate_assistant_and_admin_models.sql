-- Migration: 025_separate_assistant_and_admin_models.sql
-- Keterangan: Memisahkan konfigurasi model AI antara AI Asisten Pemilik (assistant_model_id)
--             dan AI Admin Toko (admin_model_id) pada tabel bot_configs.
--             Isolasi ketat: Tidak menyentuh knowledge_base atau greeting/nama bot.

ALTER TABLE bot_configs
ADD COLUMN IF NOT EXISTS assistant_model_id text REFERENCES ai_models(model_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS admin_model_id text REFERENCES ai_models(model_id) ON DELETE SET NULL;

-- Inisialisasi data eksisting:
-- 1. AI Asisten Pemilik: Mewarisi model yang telah dipilih owner sebelumnya (atau default Nemotron Free)
-- 2. AI Admin Toko: Secara default diatur ke Nemotron Free (agar chat pelanggan tidak membakar biaya token)
UPDATE bot_configs
SET assistant_model_id = COALESCE(selected_model_id, 'nvidia/nemotron-3.5-lightning-free'),
    admin_model_id = COALESCE(admin_model_id, 'nvidia/nemotron-3.5-lightning-free')
WHERE assistant_model_id IS NULL OR admin_model_id IS NULL;
