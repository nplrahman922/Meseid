-- Migration: 010_billing_plans.sql
-- Description: Plans registry with token limits, subscriptions, lazy rollover quota counters, and payment history.

-- 1. Plans Reference Table (Fix D: Quota Limits on Plans)
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('gratis', 'pro')),
  display_name text NOT NULL,
  price numeric(18,2) NOT NULL DEFAULT 0.00,
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
  quota_mode text NOT NULL DEFAULT 'daily' CHECK (quota_mode IN ('daily', 'monthly')),
  daily_token_limit bigint NOT NULL DEFAULT 0,
  monthly_token_limit bigint NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed Default Plans (SRS Pricing Placeholders)
INSERT INTO plans (name, display_name, price, billing_period, quota_mode, daily_token_limit, monthly_token_limit, features)
VALUES 
  ('gratis', 'Paket Gratis', 0.00, 'monthly', 'daily', 10000, 0, '{"max_channels": 1, "priority_support": false}'::jsonb),
  ('pro', 'Paket Pro UMKM', 49000.00, 'monthly', 'monthly', 0, 2000000, '{"max_channels": 5, "priority_support": true}'::jsonb)
ON CONFLICT (name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    price = EXCLUDED.price,
    quota_mode = EXCLUDED.quota_mode,
    daily_token_limit = EXCLUDED.daily_token_limit,
    monthly_token_limit = EXCLUDED.monthly_token_limit,
    features = EXCLUDED.features;

-- 1b. Plan Prices (Multi-Period Dynamic Pricing)
CREATE TABLE IF NOT EXISTS plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  price numeric(18,2) NOT NULL CHECK (price >= 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_plan_prices_plan_period UNIQUE (plan_id, billing_period)
);

INSERT INTO plan_prices (plan_id, billing_period, price, duration_days)
SELECT p.id, v.period, v.price, v.days
FROM plans p
CROSS JOIN LATERAL (
  VALUES
    ('gratis', 'monthly', 0.00, 30),
    ('pro', 'monthly', 49000.00, 30),
    ('pro', 'yearly', 490000.00, 365)
) AS v(plan_name, period, price, days)
WHERE p.name = v.plan_name
ON CONFLICT (plan_id, billing_period) DO UPDATE
SET price = EXCLUDED.price,
    duration_days = EXCLUDED.duration_days;

-- 1c. Top-Up Packages Reference Table
CREATE TABLE IF NOT EXISTS topup_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  price numeric(18,2) NOT NULL CHECK (price > 0),
  tokens bigint NOT NULL CHECK (tokens > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO topup_packages (name, display_name, price, tokens)
VALUES ('standard_topup', 'Top-up Kuota AI UMKM', 20000.00, 100000)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    price = EXCLUDED.price,
    tokens = EXCLUDED.tokens;

-- 2. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Quota Counters (Lazy Rollover)
CREATE TABLE IF NOT EXISTS quota_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('day', 'month')),
  period_key text NOT NULL,
  tokens_used bigint NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_quota_counters_owner_period UNIQUE (owner_id, period_type, period_key)
);

-- 4. Token Top-ups (For Pro users needing extra quota)
CREATE TABLE IF NOT EXISTS token_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  tokens_purchased bigint NOT NULL CHECK (tokens_purchased > 0),
  tokens_remaining bigint NOT NULL CHECK (tokens_remaining >= 0 AND tokens_remaining <= tokens_purchased),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Payment History (Midtrans Webhook Records)
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  product_type text NOT NULL DEFAULT 'subscription' CHECK (product_type IN ('subscription', 'topup')),
  gross_amount numeric(18,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'settlement', 'capture', 'deny', 'expire', 'cancel')),
  signature_verified boolean NOT NULL DEFAULT false,
  raw_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Apply Boilerplate Defaults
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'plans'::regclass,
    'subscriptions'::regclass,
    'quota_counters'::regclass,
    'token_topups'::regclass,
    'payment_history'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;

-- 7. Policies & Grants
DROP POLICY IF EXISTS plans_select_public ON plans;
CREATE POLICY plans_select_public ON plans FOR SELECT TO PUBLIC USING (true);
GRANT SELECT ON plans TO PUBLIC;

-- Subscriptions Policies
DROP POLICY IF EXISTS owner_ctx_subscriptions ON subscriptions;
CREATE POLICY owner_ctx_subscriptions ON subscriptions
  FOR SELECT TO meseid_owner_ctx
  USING (owner_id = (SELECT app_owner_id()));

DROP POLICY IF EXISTS admin_ctx_subscriptions ON subscriptions;
CREATE POLICY admin_ctx_subscriptions ON subscriptions
  FOR SELECT TO meseid_admin_ctx
  USING (true);

DROP POLICY IF EXISTS system_ctx_subscriptions ON subscriptions;
CREATE POLICY system_ctx_subscriptions ON subscriptions
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

-- Quota Counters & Top-ups Policies
CALL util_create_owner_policy('quota_counters'::regclass);
CALL util_create_owner_policy('token_topups'::regclass);

DROP POLICY IF EXISTS system_ctx_quota_counters ON quota_counters;
CREATE POLICY system_ctx_quota_counters ON quota_counters FOR ALL TO meseid_system_ctx USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_token_topups ON token_topups;
CREATE POLICY system_ctx_token_topups ON token_topups FOR ALL TO meseid_system_ctx USING (true) WITH CHECK (true);

-- Payment History Policies
DROP POLICY IF EXISTS owner_ctx_payment_history ON payment_history;
CREATE POLICY owner_ctx_payment_history ON payment_history
  FOR SELECT TO meseid_owner_ctx
  USING (owner_id = (SELECT app_owner_id()));

DROP POLICY IF EXISTS admin_ctx_payment_history ON payment_history;
CREATE POLICY admin_ctx_payment_history ON payment_history
  FOR SELECT TO meseid_admin_ctx
  USING (true);

DROP POLICY IF EXISTS system_ctx_payment_history ON payment_history;
CREATE POLICY system_ctx_payment_history ON payment_history
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON plans, plan_prices, topup_packages, subscriptions, payment_history, quota_counters, token_topups TO meseid_owner_ctx;

GRANT SELECT ON plans, plan_prices, topup_packages, subscriptions, payment_history TO meseid_admin_ctx;

GRANT SELECT, INSERT, UPDATE, DELETE ON plans, plan_prices, topup_packages, subscriptions, quota_counters, token_topups TO meseid_system_ctx;
GRANT SELECT, INSERT, UPDATE ON payment_history TO meseid_system_ctx;
