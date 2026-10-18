-- Migration: 017_erasure.sql
-- Description: Single canonical definition of UU PDP No. 27/2022 erasure (delete_owner_data).

CREATE OR REPLACE FUNCTION delete_owner_data(target_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_caller_role text;
BEGIN
  v_caller_role := NULLIF(current_setting('role', true), 'none');

  -- 1. Strictly forbid admin context from executing owner erasure
  IF v_caller_role = 'meseid_admin_ctx' THEN
    RAISE EXCEPTION 'Permission denied: admin context cannot execute delete_owner_data';
  END IF;

  -- 2. Owner context can ONLY erase their own data (cannot erase other tenants)
  IF v_caller_role = 'meseid_owner_ctx' THEN
    IF target_owner_id IS DISTINCT FROM app_owner_id() THEN
      RAISE EXCEPTION 'Permission denied: owner can only erase their own data';
    END IF;
  END IF;

  -- 3. Lookup associated user_id
  SELECT user_id INTO v_user_id
  FROM owners
  WHERE id = target_owner_id;

  IF v_user_id IS NULL AND NOT EXISTS (SELECT 1 FROM owners WHERE id = target_owner_id) THEN
    RETURN;
  END IF;

  -- 4. Delete tenant audit_log records to erase all financial transaction histories and PII
  DELETE FROM audit_log WHERE owner_id = target_owner_id;

  -- 5. Delete owner (cascades to all other tenant tables)
  DELETE FROM owners WHERE id = target_owner_id;

  -- 6. Delete associated user record if present
  IF v_user_id IS NOT NULL THEN
    DELETE FROM users WHERE id = v_user_id;
  END IF;
END;
$$;

-- 7. Permissions (Revoked from PUBLIC, meseid_app, and meseid_admin_ctx)
REVOKE ALL ON FUNCTION delete_owner_data(uuid) FROM PUBLIC, meseid_app, meseid_admin_ctx;
GRANT EXECUTE ON FUNCTION delete_owner_data(uuid) TO meseid_owner_ctx, meseid_system_ctx;
