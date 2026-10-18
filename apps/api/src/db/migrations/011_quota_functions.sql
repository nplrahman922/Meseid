-- Migration: 011_quota_functions.sql
-- Description: Quota consumption (SECURITY DEFINER) and subscription activation (SECURITY DEFINER).

-- 1. fn_consume_quota (SECURITY DEFINER reading limits from plans table)
CREATE OR REPLACE FUNCTION fn_consume_quota(
  p_owner_id uuid,
  p_tokens integer
)
RETURNS TABLE (
  allowed boolean,
  remaining bigint,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_role text;
  v_owner_tz text;
  v_plan_name text;
  v_quota_mode text;
  v_daily_limit bigint;
  v_monthly_limit bigint;
  v_period_key text;
  v_used bigint;
  v_base_avail bigint;
  v_topup_avail bigint;
  v_total_avail bigint;
  v_to_consume_base bigint;
  v_to_consume_topup bigint;
  v_topup RECORD;
BEGIN
  v_caller_role := NULLIF(current_setting('role', true), 'none');

  -- Caller Guard: Owner cannot consume quota on behalf of another tenant
  IF v_caller_role = 'meseid_owner_ctx' THEN
    IF p_owner_id IS DISTINCT FROM app_owner_id() THEN
      RAISE EXCEPTION 'Access denied: caller does not match owner_id';
    END IF;
  ELSIF v_caller_role = 'meseid_admin_ctx' THEN
    RAISE EXCEPTION 'Access denied: admin context cannot consume quota';
  END IF;

  IF p_tokens <= 0 THEN
    RETURN QUERY SELECT true, 0::bigint, 'Zero tokens requested'::text;
    RETURN;
  END IF;

  SELECT COALESCE(timezone, 'Asia/Jakarta') INTO v_owner_tz FROM owners WHERE id = p_owner_id;
  IF v_owner_tz IS NULL THEN v_owner_tz := 'Asia/Jakarta'; END IF;

  -- 1. Identify active plan and limits (active status and unexpired period end required)
  SELECT p.name, p.quota_mode, p.daily_token_limit, p.monthly_token_limit
  INTO v_plan_name, v_quota_mode, v_daily_limit, v_monthly_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.owner_id = p_owner_id AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now());

  IF v_plan_name IS NULL THEN
    SELECT p.name, p.quota_mode, p.daily_token_limit, p.monthly_token_limit
    INTO v_plan_name, v_quota_mode, v_daily_limit, v_monthly_limit
    FROM plans p WHERE p.name = 'gratis';
  END IF;

  v_daily_limit := COALESCE(v_daily_limit, 0);
  v_monthly_limit := COALESCE(v_monthly_limit, 0);
  v_quota_mode := COALESCE(v_quota_mode, 'daily');

  -- 2. Daily quota evaluation (quota_mode = 'daily')
  IF v_quota_mode = 'daily' THEN
    v_period_key := to_char(now() AT TIME ZONE v_owner_tz, 'YYYY-MM-DD');

    INSERT INTO quota_counters (owner_id, period_type, period_key, tokens_used)
    VALUES (p_owner_id, 'day', v_period_key, 0)
    ON CONFLICT (owner_id, period_type, period_key) DO NOTHING;

    SELECT tokens_used INTO v_used FROM quota_counters
    WHERE owner_id = p_owner_id AND period_type = 'day' AND period_key = v_period_key FOR UPDATE;

    IF (v_used + p_tokens) > v_daily_limit THEN
      RETURN QUERY SELECT false, GREATEST(0::bigint, v_daily_limit - v_used), 'Daily free quota exceeded'::text;
      RETURN;
    END IF;

    UPDATE quota_counters
    SET tokens_used = tokens_used + p_tokens, updated_at = now()
    WHERE owner_id = p_owner_id AND period_type = 'day' AND period_key = v_period_key;

    RETURN QUERY SELECT true, (v_daily_limit - (v_used + p_tokens)), 'OK'::text;
    RETURN;
  END IF;

  -- 3. Monthly limit + Top-ups evaluation (quota_mode = 'monthly')
  v_period_key := to_char(now() AT TIME ZONE v_owner_tz, 'YYYY-MM');

  INSERT INTO quota_counters (owner_id, period_type, period_key, tokens_used)
  VALUES (p_owner_id, 'month', v_period_key, 0)
  ON CONFLICT (owner_id, period_type, period_key) DO NOTHING;

  SELECT tokens_used INTO v_used FROM quota_counters
  WHERE owner_id = p_owner_id AND period_type = 'month' AND period_key = v_period_key FOR UPDATE;

  v_base_avail := GREATEST(0::bigint, v_monthly_limit - v_used);

  SELECT COALESCE(SUM(tokens_remaining), 0)::bigint INTO v_topup_avail
  FROM token_topups
  WHERE owner_id = p_owner_id AND status = 'active' AND (expires_at IS NULL OR expires_at > now());

  v_total_avail := v_base_avail + v_topup_avail;
  IF p_tokens > v_total_avail THEN
    RETURN QUERY SELECT false, v_total_avail, 'Pro monthly quota and top-ups exhausted'::text;
    RETURN;
  END IF;

  v_to_consume_base := LEAST(p_tokens::bigint, v_base_avail);
  IF v_to_consume_base > 0 THEN
    UPDATE quota_counters
    SET tokens_used = tokens_used + v_to_consume_base, updated_at = now()
    WHERE owner_id = p_owner_id AND period_type = 'month' AND period_key = v_period_key;
  END IF;

  v_to_consume_topup := p_tokens - v_to_consume_base;
  IF v_to_consume_topup > 0 THEN
    FOR v_topup IN
      SELECT id, tokens_remaining FROM token_topups
      WHERE owner_id = p_owner_id AND status = 'active' AND (expires_at IS NULL OR expires_at > now()) AND tokens_remaining > 0
      ORDER BY created_at ASC FOR UPDATE
    LOOP
      IF v_topup.tokens_remaining >= v_to_consume_topup THEN
        UPDATE token_topups
        SET tokens_remaining = tokens_remaining - v_to_consume_topup,
            status = CASE WHEN tokens_remaining = v_to_consume_topup THEN 'exhausted' ELSE 'active' END,
            updated_at = now()
        WHERE id = v_topup.id;
        v_to_consume_topup := 0;
        EXIT;
      ELSE
        v_to_consume_topup := v_to_consume_topup - v_topup.tokens_remaining;
        UPDATE token_topups SET tokens_remaining = 0, status = 'exhausted', updated_at = now() WHERE id = v_topup.id;
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY SELECT true, (v_total_avail - p_tokens), 'OK'::text;
  RETURN;
END;
$$;

-- 2. fn_activate_subscription (SECURITY DEFINER with Caller Guard)
CREATE OR REPLACE FUNCTION fn_activate_subscription(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_role text;
  v_pay RECORD;
  v_plan RECORD;
  v_tokens bigint;
  v_billing_period text;
  v_expected_amount numeric(18,2);
  v_duration_days integer;
  v_duration interval;
BEGIN
  v_caller_role := NULLIF(current_setting('role', true), 'none');
  IF v_caller_role = 'meseid_owner_ctx' THEN
    RAISE EXCEPTION 'Permission denied: fn_activate_subscription requires system or admin context';
  END IF;

  SELECT * INTO v_pay FROM payment_history WHERE order_id = p_order_id FOR UPDATE;
  IF v_pay.id IS NULL THEN
    RAISE EXCEPTION 'Order % not found in payment_history', p_order_id;
  END IF;

  IF (v_pay.metadata->>'activated')::boolean IS TRUE THEN
    RETURN jsonb_build_object('status', 'already_processed', 'order_id', p_order_id);
  END IF;

  IF v_pay.signature_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Signature not verified for order %', p_order_id;
  END IF;

  IF v_pay.status NOT IN ('settlement', 'capture') THEN
    RETURN jsonb_build_object('status', 'unpaid_or_failed', 'order_id', p_order_id, 'payment_status', v_pay.status);
  END IF;

  -- Route top-up orders
  IF v_pay.product_type = 'topup' THEN
    SELECT tokens INTO v_tokens FROM topup_packages WHERE price = v_pay.gross_amount LIMIT 1;
    IF v_tokens IS NULL THEN
      SELECT tokens INTO v_tokens FROM topup_packages WHERE name = COALESCE(v_pay.metadata->>'package', 'standard_topup');
    END IF;
    IF v_tokens IS NULL THEN
      RAISE EXCEPTION 'No matching topup package found for amount %', v_pay.gross_amount;
    END IF;

    INSERT INTO token_topups (owner_id, tokens_purchased, tokens_remaining, expires_at, status)
    VALUES (v_pay.owner_id, v_tokens, v_tokens, now() + interval '90 days', 'active');

    UPDATE payment_history
    SET metadata = metadata || jsonb_build_object('activated', true, 'activated_at', now(), 'tokens', v_tokens),
        updated_at = now()
    WHERE id = v_pay.id;

    RETURN jsonb_build_object('status', 'activated', 'order_id', p_order_id, 'product_type', 'topup', 'tokens', v_tokens);
  END IF;

  -- Route subscription orders
  SELECT * INTO v_plan FROM plans WHERE name = COALESCE(v_pay.metadata->>'plan', 'pro');
  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Target plan not found for order %', p_order_id;
  END IF;

  v_billing_period := COALESCE(v_pay.metadata->>'billing_period', v_plan.billing_period, 'monthly');

  SELECT price, duration_days INTO v_expected_amount, v_duration_days
  FROM plan_prices
  WHERE plan_id = v_plan.id AND billing_period = v_billing_period;

  IF v_expected_amount IS NULL THEN
    RAISE EXCEPTION 'Price for plan % and billing period % not configured in plan_prices', v_plan.name, v_billing_period;
  END IF;

  IF v_pay.gross_amount <> v_expected_amount THEN
    RAISE EXCEPTION 'Payment gross_amount % does not match expected plan price % for %', v_pay.gross_amount, v_expected_amount, v_billing_period;
  END IF;

  v_duration := (v_duration_days || ' days')::interval;

  INSERT INTO subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
  VALUES (v_pay.owner_id, v_plan.id, 'active', now(), now() + v_duration)
  ON CONFLICT (owner_id) DO UPDATE
  SET plan_id = v_plan.id,
      status = 'active',
      current_period_end = CASE 
        WHEN subscriptions.current_period_end > now() THEN subscriptions.current_period_end + v_duration
        ELSE now() + v_duration
      END,
      updated_at = now();

  UPDATE payment_history
  SET metadata = metadata || jsonb_build_object('activated', true, 'activated_at', now(), 'period', v_billing_period),
      updated_at = now()
  WHERE id = v_pay.id;

  RETURN jsonb_build_object('status', 'activated', 'order_id', p_order_id, 'plan', v_plan.name, 'period', v_billing_period);
END;
$$;

-- 3. Grants
REVOKE ALL ON FUNCTION fn_consume_quota(uuid, integer) FROM PUBLIC, meseid_app;
GRANT EXECUTE ON FUNCTION fn_consume_quota(uuid, integer) TO meseid_owner_ctx, meseid_system_ctx;

REVOKE ALL ON FUNCTION fn_activate_subscription(text) FROM PUBLIC, meseid_app;
GRANT EXECUTE ON FUNCTION fn_activate_subscription(text) TO meseid_system_ctx, meseid_admin_ctx;
