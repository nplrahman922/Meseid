-- Migration: 024_add_next_gen_ai_presets.sql
-- Keterangan: Menambahkan preset model AI generasi terbaru: Gemini 3.8 Flash,
--             Gemini 2.5 Pro, dan Qwen 3.8 Omni Flash ke tabel ai_model_presets.
--             Isolasi ketat: Tidak menyentuh tabel knowledge_base atau bot_configs.

INSERT INTO ai_model_presets (
  preset_code, display_name, badge, description, tier_required,
  model_id, fallback_model_id, temperature, max_tokens, confidence_threshold,
  system_prompt_style, strip_thinking_tags, supports_vision, supports_audio,
  supports_web_search, supports_reasoning, extra_params, score, priority_order
) VALUES
-- 1. Gemini 3.8 Flash (Generasi Baru, Cepat, Lengkap)
(
  'gemini-38-flash',
  'Gemini 3.8 Flash',
  'Generasi Terbaru & Cepat',
  'Model generasi 3.8 terbaru dari Google dengan penalaran agentic, penglihatan foto VLM kilat, audio/VN, dan pencarian web Google terintegrasi.',
  'pro',
  'google/gemini-3.8-flash',
  'google/gemini-2.5-flash',
  0.15,
  4000,
  0.90,
  'strict_json',
  false,
  true,  -- supports_vision: AKTIF
  true,  -- supports_audio: AKTIF
  true,  -- supports_web_search: AKTIF
  true,  -- supports_reasoning: AKTIF
  '{"search_grounding": true, "top_p": 0.95}'::jsonb,
  98.9,
  3
),
-- 2. Gemini 2.5 Pro (Flagship All-in-One Deep Reasoning)
(
  'gemini-pro-reasoning',
  'Gemini 2.5 Pro',
  'Flagship All-in-One',
  'Model terlengkap dengan penalaran mendalam, penglihatan foto VLM tingkat tinggi, audio native, dan pencarian web Google terintegrasi.',
  'pro',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  0.15,
  4000,
  0.92,
  'strict_json',
  false,
  true,  -- supports_vision: AKTIF
  true,  -- supports_audio: AKTIF
  true,  -- supports_web_search: AKTIF
  true,  -- supports_reasoning: AKTIF
  '{"search_grounding": true, "top_p": 0.95}'::jsonb,
  99.5,
  4
),
-- 3. Qwen 3.8 Omni Flash (Multimodal Native Super Hemat)
(
  'qwen-38-omni',
  'Qwen 3.8 Omni Flash',
  'Multimodal Super Hemat',
  'Model multimodal native dari Alibaba untuk pengenalan visual foto nota, audio/VN, dan kalkulasi bisnis dengan biaya token super efisien.',
  'pro',
  'alibaba/qwen3.8-omni-flash',
  'google/gemini-2.5-flash',
  0.20,
  3500,
  0.85,
  'strict_json',
  false,
  true,  -- supports_vision: AKTIF
  true,  -- supports_audio: AKTIF
  false, -- supports_web_search: NONAKTIF (tanpa web search bawaan gateway)
  true,  -- supports_reasoning: AKTIF
  '{"top_p": 0.90}'::jsonb,
  97.5,
  5
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

-- Susun urutan prioritas model GPT-4o Omni ke posisi 6 dan Sonar ke posisi 7
UPDATE ai_model_presets
SET priority_order = 6, updated_at = now()
WHERE preset_code = 'gpt4o-precision-pro';

UPDATE ai_model_presets
SET priority_order = 7, updated_at = now()
WHERE preset_code = 'sonar-web-pro';
