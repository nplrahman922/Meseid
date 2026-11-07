-- Migration: 021_enforce_free_tier_nemotron.sql
-- Description: Enforce nvidia/nemotron-3.5-lightning-free as default for free tier bot_configs and disable obsolete free models.

-- 1. Pastikan model nvidia/nemotron-3.5-lightning-free terdaftar resmi di ai_models
INSERT INTO ai_models (provider, model_id, tier, currency, enabled, price_input_per_1m, price_output_per_1m)
VALUES ('nvidia', 'nvidia/nemotron-3.5-lightning-free', 'free', 'IDR', true, 0.0000, 0.0000)
ON CONFLICT (model_id) DO UPDATE
SET tier = 'free', enabled = true;

-- 2. Nonaktifkan model gratis usang yang 404 atau tidak stabil, dan pastikan gpt-4o-mini bertier pro
UPDATE ai_models
SET enabled = false
WHERE model_id IN ('gemini-1.5-flash', 'reflection/beam', 'reflection/beam-free', 'stealth/glyph-cluster', 'inclusionai/ling-3.1-flash-1019');

UPDATE ai_models
SET tier = 'pro'
WHERE model_id = 'gpt-4o-mini';

-- 3. Set default column bot_configs.selected_model_id ke nvidia/nemotron-3.5-lightning-free
ALTER TABLE bot_configs
ALTER COLUMN selected_model_id SET DEFAULT 'nvidia/nemotron-3.5-lightning-free';

-- 4. Update konfigurasi bot akun yang masih mengarah ke model lama/null
UPDATE bot_configs
SET selected_model_id = 'nvidia/nemotron-3.5-lightning-free'
WHERE selected_model_id = 'gemini-1.5-flash' OR selected_model_id IS NULL;
