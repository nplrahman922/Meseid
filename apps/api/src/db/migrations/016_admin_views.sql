-- Migration: 016_admin_views.sql
-- Description: Aggregated admin management views (security_invoker = true) and least-privilege metadata grants.

-- 1. v_admin_owners (Tenant metadata only)
CREATE OR REPLACE VIEW v_admin_owners WITH (security_invoker = true) AS
SELECT 
  o.id AS owner_id,
  o.business_name,
  o.business_type,
  o.timezone,
  o.status AS owner_status,
  o.suspended_reason,
  o.created_at AS owner_created_at,
  s.status AS subscription_status,
  p.name AS plan_name,
  COALESCE(cc.channel_count, 0) AS total_channels
FROM owners o
LEFT JOIN subscriptions s ON s.owner_id = o.id
LEFT JOIN plans p ON p.id = s.plan_id
LEFT JOIN (
  SELECT owner_id, COUNT(id) AS channel_count
  FROM channel_connections
  GROUP BY owner_id
) cc ON cc.owner_id = o.id;

-- 2. v_admin_token_usage (Aggregated AI usage telemetry - no prompt text)
CREATE OR REPLACE VIEW v_admin_token_usage WITH (security_invoker = true) AS
SELECT 
  tul.owner_id,
  o.business_name,
  tul.model,
  tul.feature,
  COUNT(tul.id) AS total_calls,
  SUM(tul.input_tokens) AS total_input_tokens,
  SUM(tul.output_tokens) AS total_output_tokens,
  SUM(tul.total_tokens) AS total_tokens,
  SUM(tul.cost_estimate) AS total_cost_estimate,
  ROUND(AVG(tul.latency_ms), 2) AS avg_latency_ms
FROM token_usage_logs tul
JOIN owners o ON o.id = tul.owner_id
GROUP BY tul.owner_id, o.business_name, tul.model, tul.feature;

-- 3. v_admin_system_health (System operational telemetry)
CREATE OR REPLACE VIEW v_admin_system_health WITH (security_invoker = true) AS
SELECT 
  sl.component,
  sl.level,
  COUNT(sl.id) AS error_count,
  MAX(sl.created_at) AS last_occurred_at
FROM system_logs sl
WHERE sl.created_at >= now() - interval '24 hours'
GROUP BY sl.component, sl.level;

-- 4. Admin Grants on Views
GRANT SELECT ON v_admin_owners TO meseid_admin_ctx;
GRANT SELECT ON v_admin_token_usage TO meseid_admin_ctx;
GRANT SELECT ON v_admin_system_health TO meseid_admin_ctx;

-- 5. Underlying Column Grants & Policies for Admin Views
GRANT SELECT (id, business_name, business_type, timezone, status, suspended_reason, created_at, updated_at) ON owners TO meseid_admin_ctx;
GRANT SELECT (id, owner_id, channel, status) ON channel_connections TO meseid_admin_ctx;
GRANT SELECT (id, owner_id, model, feature, input_tokens, output_tokens, total_tokens, cost_estimate, latency_ms, status, created_at) ON token_usage_logs TO meseid_admin_ctx;

DROP POLICY IF EXISTS admin_ctx_token_usage_logs ON token_usage_logs;
CREATE POLICY admin_ctx_token_usage_logs ON token_usage_logs FOR SELECT TO meseid_admin_ctx USING (true);

DROP POLICY IF EXISTS admin_ctx_channel_connections ON channel_connections;
CREATE POLICY admin_ctx_channel_connections ON channel_connections FOR SELECT TO meseid_admin_ctx USING (true);
