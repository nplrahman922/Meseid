-- Migration: 009_finance_security.sql
-- Description: Financial RLS policies, least-privilege role permissions, and documented system grants.

-- 1. Owner RLS Policies for Finance Tables
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'accounts'::regclass,
    'parties'::regclass,
    'jurnal_umum'::regclass,
    'jurnal_baris'::regclass,
    'buku_pembantu'::regclass,
    'pending_actions'::regclass
  ]) LOOP
    CALL util_create_owner_policy(t);
  END LOOP;
END;
$$;

-- Owner policy for audit_log (read-only for own records)
DROP POLICY IF EXISTS owner_ctx_audit_log ON audit_log;
CREATE POLICY owner_ctx_audit_log ON audit_log
  FOR SELECT TO meseid_owner_ctx
  USING (owner_id = (SELECT app_owner_id()));

-- 2. Owner Context Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON 
  accounts, parties, buku_pembantu, pending_actions
TO meseid_owner_ctx;

GRANT SELECT, INSERT ON 
  jurnal_umum, jurnal_baris
TO meseid_owner_ctx;

GRANT SELECT ON audit_log, buku_besar, neraca_saldo, buku_kas, subledger_aging TO meseid_owner_ctx;

GRANT EXECUTE ON FUNCTION 
  fn_post_journal(uuid, jsonb, jsonb),
  fn_reverse_journal(uuid, uuid, text),
  fn_confirm_pending_action(uuid),
  fn_income_statement(uuid, date, date),
  fn_balance_sheet(uuid, date)
TO meseid_owner_ctx;

-- 3. Admin Context Grants & Policies
-- Strictly metadata and audit trail; NO permissions on financial core or financial views.
GRANT SELECT ON audit_log TO meseid_admin_ctx;

DROP POLICY IF EXISTS admin_ctx_audit_log ON audit_log;
CREATE POLICY admin_ctx_audit_log ON audit_log
  FOR SELECT TO meseid_admin_ctx
  USING (true);

-- 4. System Context Grants & Policies (Fix E: Strictly Justified)
-- JUSTIFICATION:
-- Background message ingestion pipeline (WhatsApp/Telegram bot and OCR parsers) must insert 
-- proposed transactions into `pending_actions` for owner review and confirmation. 
-- In addition, automated cron procedures need access to expire stale pending actions.
-- Direct access to core ledger tables (accounts, parties, jurnal_umum, jurnal_baris, buku_pembantu)
-- is completely removed for meseid_system_ctx to prevent unconfirmed ledger mutations.
GRANT SELECT, INSERT, UPDATE ON pending_actions TO meseid_system_ctx;

DROP POLICY IF EXISTS system_ctx_pending_actions ON pending_actions;
CREATE POLICY system_ctx_pending_actions ON pending_actions
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);
