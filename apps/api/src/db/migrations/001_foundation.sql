-- Migration: 001_foundation.sql
-- Description: Core extensions, role validation, session variables, triggers, and tenant utility helpers.

-- 1. Validate Required Context Roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_owner_ctx') THEN
    RAISE EXCEPTION 'Role meseid_owner_ctx does not exist. Run db/init scripts first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_admin_ctx') THEN
    RAISE EXCEPTION 'Role meseid_admin_ctx does not exist. Run db/init scripts first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_system_ctx') THEN
    RAISE EXCEPTION 'Role meseid_system_ctx does not exist. Run db/init scripts first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meseid_app') THEN
    RAISE EXCEPTION 'Role meseid_app does not exist. Run db/init scripts first.';
  END IF;
END;
$$;

-- 2. Core Extensions
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 3. Session Context Accessors
CREATE OR REPLACE FUNCTION app_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(current_setting('app.owner_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

GRANT EXECUTE ON FUNCTION app_owner_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_user_id() TO PUBLIC;

-- 4. Shared Trigger Functions
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_prevent_owner_id_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    RAISE EXCEPTION 'owner_id is immutable and cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Tenant Setup Boilerplate Helpers
CREATE OR REPLACE PROCEDURE util_apply_tenant_defaults(p_table regclass)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tbl text := p_table::text;
  v_clean text := replace(replace(v_tbl, '"', ''), 'public.', '');
BEGIN
  -- updated_at trigger (if updated_at column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = v_clean AND column_name = 'updated_at'
  ) THEN
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %s;
       CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
      v_clean, v_tbl, v_clean, v_tbl
    );
  END IF;

  -- owner_immutable trigger (if owner_id column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = v_clean AND column_name = 'owner_id'
  ) THEN
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_owner_immutable ON %s;
       CREATE TRIGGER trg_%I_owner_immutable BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION trigger_prevent_owner_id_change();
       CREATE INDEX IF NOT EXISTS idx_%I_owner_id ON %s (owner_id);',
      v_clean, v_tbl, v_clean, v_tbl, v_clean, v_tbl
    );
  END IF;

  -- Enable and force RLS
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY; ALTER TABLE %s FORCE ROW LEVEL SECURITY;', v_tbl, v_tbl);
END;
$$;

CREATE OR REPLACE PROCEDURE util_create_owner_policy(p_table regclass)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tbl text := p_table::text;
  v_clean text := replace(replace(v_tbl, '"', ''), 'public.', '');
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS owner_ctx_%I ON %s;
     CREATE POLICY owner_ctx_%I ON %s FOR ALL TO meseid_owner_ctx
     USING (owner_id = (SELECT app_owner_id()))
     WITH CHECK (owner_id = (SELECT app_owner_id()));',
    v_clean, v_tbl, v_clean, v_tbl
  );
END;
$$;
