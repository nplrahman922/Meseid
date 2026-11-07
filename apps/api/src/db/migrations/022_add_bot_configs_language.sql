-- Migration: 022_add_bot_configs_language.sql
-- Menambahkan preferensi bahasa balasan bot yang bebas didefinisikan oleh owner.
-- Default 'auto' untuk otomatis mengikuti bahasa dan gaya tutur penanya.

ALTER TABLE bot_configs
ADD COLUMN IF NOT EXISTS admin_language text NOT NULL DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS assistant_language text NOT NULL DEFAULT 'auto';

COMMENT ON COLUMN bot_configs.admin_language IS 'Preferensi bahasa balasan admin toko yang bebas didefinisikan owner (default: auto)';
COMMENT ON COLUMN bot_configs.assistant_language IS 'Preferensi bahasa balasan asisten pemilik yang bebas didefinisikan owner (default: auto)';
