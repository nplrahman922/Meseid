-- Migration: 023_create_ai_model_presets.sql
-- Keterangan: Membuat tabel katalog dan parameter preset model AI (1 Free, 3 Pro)
--             termasuk saklar fitur multimodal (vision, audio, web search) dan parameter racikan.

CREATE TABLE IF NOT EXISTS ai_model_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_code text UNIQUE NOT NULL,
  display_name text NOT NULL,
  badge text NOT NULL,
  description text NOT NULL,
  tier_required text NOT NULL CHECK (tier_required IN ('free', 'pro')),
  
  -- Konfigurasi Engine AI Vendor
  model_id text NOT NULL,
  fallback_model_id text,
  temperature numeric(3,2) NOT NULL DEFAULT 0.20,
  max_tokens integer NOT NULL DEFAULT 3000,
  confidence_threshold numeric(3,2) NOT NULL DEFAULT 0.85,
  system_prompt_style text NOT NULL DEFAULT 'strict_json',
  strip_thinking_tags boolean NOT NULL DEFAULT false,
  
  -- Kapabilitas Fitur
  supports_vision boolean NOT NULL DEFAULT false,
  supports_audio boolean NOT NULL DEFAULT false,
  supports_web_search boolean NOT NULL DEFAULT false,
  supports_reasoning boolean NOT NULL DEFAULT true,
  score numeric(4,1) NOT NULL DEFAULT 95.0,
  
  -- Parameter Vendor Tambahan
  extra_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Kontrol Operasional & Tampilan
  is_active boolean NOT NULL DEFAULT true,
  priority_order integer NOT NULL DEFAULT 1,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_model_presets_active_priority 
ON ai_model_presets (is_active, priority_order);

-- Seeding 4 Model AI Teruji
INSERT INTO ai_model_presets (
  preset_code, display_name, badge, description, tier_required,
  model_id, fallback_model_id, temperature, max_tokens, confidence_threshold,
  system_prompt_style, strip_thinking_tags, supports_vision, supports_audio,
  supports_web_search, supports_reasoning, extra_params, score, priority_order
) VALUES
-- 1. Bot Standar Free
(
  'nemotron-free',
  'Nemotron 3.5 Free',
  'Gratis Selamanya',
  'Model percakapan bisnis standar tanpa biaya token untuk melayani tanya jawab pelanggan dan pencatatan operasional harian.',
  'free',
  'nvidia/nemotron-3.5-lightning-free',
  NULL,
  0.10,
  8000,
  0.80,
  'strict_json',
  false,
  false,
  false,
  false,
  true,
  '{"top_p": 0.90}'::jsonb,
  94.0,
  1
),
-- 2. Bot Pro Serbaguna (All-Rounder)
(
  'gemini-flash-pro',
  'Gemini 2.5 Flash',
  'Multimodal & Cepat',
  'Model cerdas serbaguna berkecepatan super cepat dengan kemampuan membaca foto nota belanja, pemrosesan audio/VN, penalaran bisnis, dan pencarian web Google.',
  'pro',
  'google/gemini-2.5-flash',
  'openai/gpt-4o-mini',
  0.20,
  4000,
  0.85,
  'strict_json',
  true,
  true,
  true,
  true,
  true,
  '{"top_p": 0.95, "search_grounding": true}'::jsonb,
  98.0,
  2
),
-- 3. Bot Pro Presisi Tinggi (Flagship)
(
  'gpt4o-precision-pro',
  'GPT-4o Omni',
  'Akurasi & Presisi',
  'Model berakurasi standar industri tertinggi untuk ekstraksi nota belanja rumit, tabel faktur keuangan, input audio, dan kalkulasi angka tanpa kompromi.',
  'pro',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  0.20,
  3000,
  0.90,
  'strict_json',
  false,
  true,
  true,
  false,
  true,
  '{"top_p": 0.95, "detail": "high"}'::jsonb,
  97.9,
  3
),
-- 4. Bot Pro Riset Web (Autonomous Search)
(
  'sonar-web-pro',
  'Sonar Web Search',
  'Pencarian Real-Time',
  'Model riset pasar langsung ke internet secara real-time untuk mengecek pergerakan harga komoditas, kurs mata uang, dan tren supplier bisnis.',
  'pro',
  'perplexity/sonar',
  'google/gemini-2.5-flash',
  0.15,
  2500,
  0.85,
  'plain_text_regex',
  true,
  true,
  false,
  true,
  true,
  '{"top_p": 0.90, "search_domain_filter": []}'::jsonb,
  96.5,
  4
)
ON CONFLICT (preset_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  tier_required = EXCLUDED.tier_required,
  model_id = EXCLUDED.model_id,
  fallback_model_id = EXCLUDED.fallback_model_id,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  confidence_threshold = EXCLUDED.confidence_threshold,
  system_prompt_style = EXCLUDED.system_prompt_style,
  strip_thinking_tags = EXCLUDED.strip_thinking_tags,
  supports_vision = EXCLUDED.supports_vision,
  supports_audio = EXCLUDED.supports_audio,
  supports_web_search = EXCLUDED.supports_web_search,
  supports_reasoning = EXCLUDED.supports_reasoning,
  extra_params = EXCLUDED.extra_params,
  score = EXCLUDED.score,
  priority_order = EXCLUDED.priority_order,
  updated_at = now();
