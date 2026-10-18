-- Migration: 012_ai_usage.sql
-- Description: AI models registry and token usage telemetry with automated cost calculation.

-- 1. AI Models Registry (Fix F: Currency Column, Seed moved to seed.ts)
CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_id text NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('free', 'pro')),
  currency text NOT NULL DEFAULT 'IDR',
  enabled boolean NOT NULL DEFAULT true,
  price_input_per_1m numeric(18,4) NOT NULL DEFAULT 0.0000,
  price_output_per_1m numeric(18,4) NOT NULL DEFAULT 0.0000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Baseline Reference Models (Production-safe: ON CONFLICT DO NOTHING preserves operator changes)
INSERT INTO ai_models (provider, model_id, tier, currency, enabled, price_input_per_1m, price_output_per_1m)
VALUES
  ('google', 'gemini-1.5-flash', 'free', 'IDR', true, 1.1500, 4.6000),
  ('google', 'gemini-1.5-pro', 'pro', 'IDR', true, 53.0000, 210.0000),
  ('openai', 'gpt-4o-mini', 'free', 'IDR', true, 2.3000, 9.2000),
  ('openai', 'gpt-4o', 'pro', 'IDR', true, 38.0000, 150.0000)
ON CONFLICT (model_id) DO NOTHING;

-- Link bot_configs.selected_model_id to ai_models
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_bot_configs_selected_model'
  ) THEN
    ALTER TABLE bot_configs
      ADD CONSTRAINT fk_bot_configs_selected_model
      FOREIGN KEY (selected_model_id) REFERENCES ai_models(model_id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- 2. Token Usage Logs (No raw user prompt or response content stored)
CREATE TABLE IF NOT EXISTS token_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  request_id text NOT NULL UNIQUE,
  model text NOT NULL,
  feature text NOT NULL CHECK (feature IN ('chat', 'ocr', 'report')),
  input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  cost_estimate numeric(18,6) NOT NULL DEFAULT 0.000000,
  latency_ms integer CHECK (latency_ms >= 0),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'timeout')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Cost Calculation Trigger
CREATE OR REPLACE FUNCTION trigger_calc_token_usage_cost()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_model RECORD;
BEGIN
  NEW.total_tokens := COALESCE(NEW.input_tokens, 0) + COALESCE(NEW.output_tokens, 0);

  SELECT price_input_per_1m, price_output_per_1m INTO v_model
  FROM ai_models
  WHERE model_id = NEW.model;

  IF v_model.price_input_per_1m IS NOT NULL THEN
    NEW.cost_estimate := ROUND(
      (NEW.input_tokens::numeric * v_model.price_input_per_1m / 1000000.0) +
      (NEW.output_tokens::numeric * v_model.price_output_per_1m / 1000000.0),
      6
    );
  ELSE
    NEW.cost_estimate := 0.000000;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_token_usage_cost ON token_usage_logs;
CREATE TRIGGER trg_calc_token_usage_cost
BEFORE INSERT ON token_usage_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_calc_token_usage_cost();

-- 4. Apply Boilerplate Defaults
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ai_models'::regclass,
    'token_usage_logs'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;

-- 5. Policies & Grants
DROP POLICY IF EXISTS ai_models_select_public ON ai_models;
DROP POLICY IF EXISTS ai_models_select_all ON ai_models;
CREATE POLICY ai_models_select_all ON ai_models
  FOR SELECT TO meseid_owner_ctx, meseid_admin_ctx, meseid_system_ctx
  USING (true);

DROP POLICY IF EXISTS ai_models_admin_all ON ai_models;
CREATE POLICY ai_models_admin_all ON ai_models
  FOR ALL TO meseid_admin_ctx
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS ai_models_system_all ON ai_models;
CREATE POLICY ai_models_system_all ON ai_models
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON ai_models TO meseid_owner_ctx, meseid_admin_ctx, meseid_system_ctx;
GRANT INSERT, UPDATE, DELETE ON ai_models TO meseid_admin_ctx, meseid_system_ctx;

CALL util_create_owner_policy('token_usage_logs'::regclass);

DROP POLICY IF EXISTS system_ctx_token_usage_logs ON token_usage_logs;
CREATE POLICY system_ctx_token_usage_logs ON token_usage_logs
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON token_usage_logs TO meseid_owner_ctx;
GRANT SELECT, INSERT ON token_usage_logs TO meseid_system_ctx;
