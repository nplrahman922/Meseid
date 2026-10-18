-- Migration: 003_tenancy_security.sql
-- Description: RLS policies, permissions, and channel resolution security for tenancy tables.

-- 1. Configure System Context Inheritance for Ingestion Channel Resolution
GRANT meseid_system_ctx TO meseid_app WITH INHERIT TRUE;
ALTER ROLE meseid_app INHERIT;

-- 2. Owner Policies for Tenancy Content Tables
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'google_connections'::regclass,
    'channel_connections'::regclass,
    'bot_configs'::regclass,
    'knowledge_base'::regclass
  ]) LOOP
    CALL util_create_owner_policy(t);
  END LOOP;
END;
$$;

-- 3. Users Table Policies
DROP POLICY IF EXISTS owner_ctx_users ON users;
CREATE POLICY owner_ctx_users ON users
  FOR ALL TO meseid_owner_ctx
  USING (id = (SELECT app_user_id()))
  WITH CHECK (id = (SELECT app_user_id()));

DROP POLICY IF EXISTS admin_ctx_users ON users;
CREATE POLICY admin_ctx_users ON users
  FOR SELECT TO meseid_admin_ctx
  USING (true);

DROP POLICY IF EXISTS system_ctx_users ON users;
CREATE POLICY system_ctx_users ON users
  FOR SELECT TO meseid_system_ctx
  USING (true);

-- 4. Owners Table Policies
DROP POLICY IF EXISTS owner_ctx_owners ON owners;
CREATE POLICY owner_ctx_owners ON owners
  FOR ALL TO meseid_owner_ctx
  USING (id = (SELECT app_owner_id()))
  WITH CHECK (id = (SELECT app_owner_id()));

DROP POLICY IF EXISTS admin_ctx_owners ON owners;
CREATE POLICY admin_ctx_owners ON owners
  FOR SELECT TO meseid_admin_ctx
  USING (true);

DROP POLICY IF EXISTS admin_ctx_owners_update ON owners;
CREATE POLICY admin_ctx_owners_update ON owners
  FOR UPDATE TO meseid_admin_ctx
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_owners ON owners;
CREATE POLICY system_ctx_owners ON owners
  FOR SELECT TO meseid_system_ctx
  USING (true);

-- 5. System Context Ingestion Policies
DROP POLICY IF EXISTS system_ctx_channel_connections ON channel_connections;
CREATE POLICY system_ctx_channel_connections ON channel_connections
  FOR SELECT TO meseid_system_ctx
  USING (true);

DROP POLICY IF EXISTS system_ctx_bot_configs ON bot_configs;
CREATE POLICY system_ctx_bot_configs ON bot_configs
  FOR SELECT TO meseid_system_ctx
  USING (true);

DROP POLICY IF EXISTS system_ctx_knowledge_base ON knowledge_base;
CREATE POLICY system_ctx_knowledge_base ON knowledge_base
  FOR SELECT TO meseid_system_ctx
  USING (true);

GRANT SELECT, UPDATE ON users, owners TO meseid_owner_ctx;
GRANT SELECT, INSERT, UPDATE, DELETE ON google_connections, channel_connections, bot_configs, knowledge_base TO meseid_owner_ctx;

GRANT SELECT ON users, owners TO meseid_admin_ctx;
GRANT UPDATE (status, suspended_reason, updated_at) ON owners TO meseid_admin_ctx;

GRANT SELECT ON users, owners, channel_connections, bot_configs, knowledge_base TO meseid_system_ctx;

-- 7. resolve_channel_identity (SECURITY DEFINER with Caller Guard)
CREATE OR REPLACE FUNCTION resolve_channel_identity(
  p_channel text,
  p_external_account_id text
)
RETURNS TABLE (
  owner_id uuid,
  user_id uuid,
  business_name text,
  owner_status text,
  user_status text,
  user_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Security Guard: Callable strictly by system pipeline or table owner
  IF current_user NOT IN ('meseid_system_ctx', 'meseid_app', 'postgres', 'meseid') THEN
    RAISE EXCEPTION 'Permission denied: resolve_channel_identity requires system context';
  END IF;

  RETURN QUERY
  SELECT 
    o.id AS owner_id,
    u.id AS user_id,
    o.business_name,
    o.status AS owner_status,
    u.status AS user_status,
    u.role AS user_role
  FROM channel_connections cc
  JOIN owners o ON o.id = cc.owner_id
  JOIN users u ON u.id = o.user_id
  WHERE cc.channel = p_channel
    AND cc.external_account_id = p_external_account_id
    AND cc.status = 'connected';
END;
$$;

-- Grant EXECUTE exclusively to meseid_system_ctx (No direct grant to meseid_app)
REVOKE ALL ON FUNCTION resolve_channel_identity(text, text) FROM PUBLIC, meseid_app;
GRANT EXECUTE ON FUNCTION resolve_channel_identity(text, text) TO meseid_system_ctx;
