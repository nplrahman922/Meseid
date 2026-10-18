-- Migration: 015_ops_admin.sql
-- Description: System logs, alerts, append-only admin audit trail, and admin operations.

-- 1. System Logs (Operational Telemetry)
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  component text NOT NULL,
  code text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Alerts (Incident Tracking)
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Admin Audit Log (Fix C: target_owner_id without blocking FK)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_owner_id uuid,
  action text NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Append-Only Protection for admin_audit_log
CREATE OR REPLACE FUNCTION trigger_prevent_admin_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_owner oid;
BEGIN
  SELECT relowner INTO v_table_owner FROM pg_class WHERE oid = TG_RELID;
  IF pg_has_role(current_user, v_table_owner, 'MEMBER') THEN
    IF TG_OP = 'DELETE' THEN 
      RETURN OLD; 
    ELSE 
      RETURN NEW; 
    END IF;
  END IF;

  RAISE EXCEPTION 'admin_audit_log is append-only and cannot be altered or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_audit_log_mutation ON admin_audit_log;
CREATE TRIGGER trg_prevent_admin_audit_log_mutation
BEFORE UPDATE OR DELETE ON admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION trigger_prevent_admin_audit_log_mutation();

-- 4. Stored Procedures
CREATE OR REPLACE PROCEDURE sp_purge_old_logs(p_retention_days integer DEFAULT 30)
LANGUAGE plpgsql
AS $$
DECLARE
  v_cutoff timestamptz;
  v_batch_size integer := 5000;
  v_count integer;
BEGIN
  v_cutoff := now() - (p_retention_days || ' days')::interval;

  -- 1. Purge system_logs in batches
  LOOP
    WITH to_delete AS (
      SELECT id FROM system_logs
      WHERE created_at < v_cutoff
      LIMIT v_batch_size
    )
    DELETE FROM system_logs WHERE id IN (SELECT id FROM to_delete);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    COMMIT;
    EXIT WHEN v_count < v_batch_size;
  END LOOP;

  -- 2. Purge inbound_messages in batches
  LOOP
    WITH to_delete AS (
      SELECT id FROM inbound_messages
      WHERE created_at < v_cutoff
      LIMIT v_batch_size
    )
    DELETE FROM inbound_messages WHERE id IN (SELECT id FROM to_delete);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    COMMIT;
    EXIT WHEN v_count < v_batch_size;
  END LOOP;

  -- 3. Purge chat_logs in batches
  LOOP
    WITH to_delete AS (
      SELECT id FROM chat_logs
      WHERE created_at < v_cutoff
      LIMIT v_batch_size
    )
    DELETE FROM chat_logs WHERE id IN (SELECT id FROM to_delete);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    COMMIT;
    EXIT WHEN v_count < v_batch_size;
  END LOOP;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_expire_pending_actions()
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE pending_actions
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
END;
$$;

-- 5. Admin Operations (Strict admin role + Active admin verification + Owner existence)
DROP FUNCTION IF EXISTS fn_suspend_owner(uuid, uuid, text);

CREATE OR REPLACE FUNCTION fn_suspend_owner(
  p_owner_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_role text;
  v_admin_id uuid;
BEGIN
  v_caller_role := NULLIF(current_setting('role', true), 'none');
  IF v_caller_role IS NOT NULL AND v_caller_role <> 'meseid_admin_ctx' THEN
    RAISE EXCEPTION 'Permission denied: fn_suspend_owner requires admin context';
  END IF;

  v_admin_id := app_user_id();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user id not set in session (app.user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = v_admin_id AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acting user % is not an active admin', v_admin_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM owners WHERE id = p_owner_id) THEN
    RAISE EXCEPTION 'Owner % does not exist', p_owner_id;
  END IF;

  UPDATE owners
  SET status = 'suspended',
      suspended_reason = p_reason,
      updated_at = now()
  WHERE id = p_owner_id;

  INSERT INTO admin_audit_log (admin_id, target_owner_id, action, reason)
  VALUES (v_admin_id, p_owner_id, 'SUSPEND_OWNER', p_reason);
END;
$$;

-- 6. Apply Boilerplate Defaults
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'system_logs'::regclass,
    'alerts'::regclass,
    'admin_audit_log'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;

-- 7. Policies & Grants
DROP POLICY IF EXISTS admin_ctx_system_logs ON system_logs;
CREATE POLICY admin_ctx_system_logs ON system_logs FOR SELECT TO meseid_admin_ctx USING (true);

DROP POLICY IF EXISTS system_ctx_system_logs ON system_logs;
CREATE POLICY system_ctx_system_logs ON system_logs FOR ALL TO meseid_system_ctx USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_ctx_alerts ON alerts;
CREATE POLICY admin_ctx_alerts ON alerts FOR ALL TO meseid_admin_ctx USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_alerts ON alerts;
CREATE POLICY system_ctx_alerts ON alerts FOR ALL TO meseid_system_ctx USING (true) WITH CHECK (true);

-- admin_audit_log: SELECT and INSERT only
DROP POLICY IF EXISTS admin_ctx_admin_audit_log ON admin_audit_log;
DROP POLICY IF EXISTS admin_ctx_admin_audit_log_select ON admin_audit_log;
CREATE POLICY admin_ctx_admin_audit_log_select ON admin_audit_log FOR SELECT TO meseid_admin_ctx USING (true);

DROP POLICY IF EXISTS admin_ctx_admin_audit_log_insert ON admin_audit_log;
CREATE POLICY admin_ctx_admin_audit_log_insert ON admin_audit_log FOR INSERT TO meseid_admin_ctx WITH CHECK (true);

-- Grants
GRANT SELECT ON system_logs TO meseid_admin_ctx;
GRANT SELECT, INSERT, UPDATE, DELETE ON alerts TO meseid_admin_ctx;
GRANT SELECT, INSERT ON admin_audit_log TO meseid_admin_ctx;

GRANT SELECT, INSERT ON system_logs TO meseid_system_ctx;
GRANT SELECT, INSERT, UPDATE, DELETE ON alerts TO meseid_system_ctx;

GRANT EXECUTE ON PROCEDURE sp_purge_old_logs(integer), sp_expire_pending_actions() TO meseid_system_ctx, meseid_admin_ctx;

REVOKE ALL ON FUNCTION fn_suspend_owner(uuid, text) FROM PUBLIC, meseid_app;
GRANT EXECUTE ON FUNCTION fn_suspend_owner(uuid, text) TO meseid_admin_ctx;
