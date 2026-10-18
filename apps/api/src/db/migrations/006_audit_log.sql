-- Migration: 006_audit_log.sql
-- Description: Audit logging infrastructure, tamper-proof triggers, and attachment to finance entities.

-- 1. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES owners(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Append-Only Protection Trigger (Table owner bypass only)
CREATE OR REPLACE FUNCTION trigger_prevent_audit_log_mutation()
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

  RAISE EXCEPTION 'audit_log is append-only and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON audit_log;
CREATE TRIGGER trg_prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION trigger_prevent_audit_log_mutation();

-- 3. Audit Capture Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid;
  v_user_id uuid;
  v_record_id uuid;
  v_details jsonb;
BEGIN
  v_owner_id := app_owner_id();
  v_user_id := app_user_id();

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_owner_id := COALESCE(v_owner_id, OLD.owner_id);
    v_details := jsonb_build_object('operation', TG_OP, 'old_id', OLD.id);
  ELSE
    v_record_id := NEW.id;
    v_owner_id := COALESCE(v_owner_id, NEW.owner_id);
    IF TG_TABLE_NAME = 'jurnal_umum' THEN
      v_details := jsonb_build_object('description', NEW.description, 'source', NEW.source, 'kind', NEW.kind);
    ELSIF TG_TABLE_NAME = 'jurnal_baris' THEN
      v_details := jsonb_build_object('journal_id', NEW.journal_id, 'account_id', NEW.account_id, 'debit', NEW.debit, 'credit', NEW.credit);
    ELSIF TG_TABLE_NAME = 'accounts' THEN
      v_details := jsonb_build_object('code', NEW.code, 'name', NEW.name, 'type', NEW.type);
    ELSIF TG_TABLE_NAME = 'parties' THEN
      v_details := jsonb_build_object('name', NEW.name, 'type', NEW.type);
    ELSE
      v_details := jsonb_build_object('operation', TG_OP);
    END IF;
  END IF;

  -- Skip audit logging during cascading owner erasure if owner record no longer exists
  IF NOT EXISTS (SELECT 1 FROM owners WHERE id = v_owner_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO audit_log (owner_id, user_id, action, table_name, record_id, details)
  VALUES (v_owner_id, v_user_id, TG_OP, TG_TABLE_NAME, v_record_id, v_details);

  RETURN NULL;
END;
$$;

-- 4. Attach Audit Triggers to Financial Core Tables
DROP TRIGGER IF EXISTS trg_audit_jurnal_umum ON jurnal_umum;
CREATE TRIGGER trg_audit_jurnal_umum AFTER INSERT OR UPDATE OR DELETE ON jurnal_umum FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_accounts ON accounts;
CREATE TRIGGER trg_audit_accounts AFTER INSERT OR UPDATE OR DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_parties ON parties;
CREATE TRIGGER trg_audit_parties AFTER INSERT OR UPDATE OR DELETE ON parties FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_buku_pembantu ON buku_pembantu;
CREATE TRIGGER trg_audit_buku_pembantu AFTER INSERT OR UPDATE OR DELETE ON buku_pembantu FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_pending_actions ON pending_actions;
CREATE TRIGGER trg_audit_pending_actions AFTER INSERT OR UPDATE OR DELETE ON pending_actions FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- 5. Enable and Force RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_log_owner_id ON audit_log (owner_id);
