-- Migration: 005_finance_journal.sql
-- Description: Financial journals, journal lines, subledgers, pending actions, and integrity triggers.

-- 1. Jurnal Umum (Header)
CREATE TABLE IF NOT EXISTS jurnal_umum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  tx_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  source text NOT NULL CHECK (source IN ('text', 'ocr', 'manual')),
  source_ref text,
  kind text NOT NULL DEFAULT 'normal' CHECK (kind IN ('normal', 'reversal')),
  reverses_journal_id uuid REFERENCES jurnal_umum(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique partial index for journal reversal idempotency and single reversal enforcement
CREATE UNIQUE INDEX IF NOT EXISTS uq_jurnal_umum_reverses_journal_id
  ON jurnal_umum (reverses_journal_id)
  WHERE reverses_journal_id IS NOT NULL;

-- 2. Jurnal Baris (Lines - Single Source of Truth)
CREATE TABLE IF NOT EXISTS jurnal_baris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES jurnal_umum(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  debit numeric(18,2) NOT NULL DEFAULT 0.00,
  credit numeric(18,2) NOT NULL DEFAULT 0.00,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_jurnal_baris_non_negative CHECK (debit >= 0 AND credit >= 0),
  CONSTRAINT chk_jurnal_baris_one_side CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

-- 3. Buku Pembantu (Subledger utang/piutang linked to journal line)
CREATE TABLE IF NOT EXISTS buku_pembantu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  journal_line_id uuid UNIQUE REFERENCES jurnal_baris(id) ON DELETE CASCADE,
  due_date date,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  settled_amount numeric(18,2) NOT NULL DEFAULT 0.00 CHECK (settled_amount >= 0 AND settled_amount <= amount),
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'voided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Pending Actions (Confirm before saving flow)
CREATE TABLE IF NOT EXISTS pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Journal Balance Validation Trigger (DEFERRABLE INITIALLY DEFERRED)
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_journal_id uuid;
  v_line_count int;
  v_sum_debit numeric(18,2);
  v_sum_credit numeric(18,2);
BEGIN
  IF TG_TABLE_NAME = 'jurnal_umum' THEN
    v_journal_id := NEW.id;
  ELSE
    v_journal_id := COALESCE(NEW.journal_id, OLD.journal_id);
  END IF;

  -- Skip if journal header was deleted
  IF NOT EXISTS (SELECT 1 FROM jurnal_umum WHERE id = v_journal_id) THEN
    RETURN NULL;
  END IF;

  SELECT 
    COUNT(*),
    COALESCE(SUM(debit), 0.00),
    COALESCE(SUM(credit), 0.00)
  INTO v_line_count, v_sum_debit, v_sum_credit
  FROM jurnal_baris
  WHERE journal_id = v_journal_id;

  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'Journal % must have at least 2 lines (found %)', v_journal_id, v_line_count;
  END IF;

  IF v_sum_debit <> v_sum_credit THEN
    RAISE EXCEPTION 'Journal % is unbalanced: debit (%) != credit (%)', v_journal_id, v_sum_debit, v_sum_credit;
  END IF;

  IF v_sum_debit <= 0 THEN
    RAISE EXCEPTION 'Journal % total debit/credit must be greater than zero', v_journal_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_journal_balance_header ON jurnal_umum;
CREATE CONSTRAINT TRIGGER trg_check_journal_balance_header
AFTER INSERT OR UPDATE ON jurnal_umum
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_journal_balance();

DROP TRIGGER IF EXISTS trg_check_journal_balance_lines ON jurnal_baris;
CREATE CONSTRAINT TRIGGER trg_check_journal_balance_lines
AFTER INSERT OR UPDATE OR DELETE ON jurnal_baris
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_journal_balance();

-- 6. Immutability Trigger (Fix B: Table Owner Bypass Only)
CREATE OR REPLACE FUNCTION trigger_prevent_journal_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_owner oid;
BEGIN
  -- Allow bypass only when current_user is the table owner (or member of owner role)
  SELECT relowner INTO v_table_owner FROM pg_class WHERE oid = TG_RELID;
  IF pg_has_role(current_user, v_table_owner, 'MEMBER') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Posted journal records and lines are immutable. Corrections must be made via a reversal journal.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_jurnal_umum_mutation ON jurnal_umum;
CREATE TRIGGER trg_prevent_jurnal_umum_mutation
BEFORE UPDATE OR DELETE ON jurnal_umum
FOR EACH ROW
EXECUTE FUNCTION trigger_prevent_journal_mutation();

DROP TRIGGER IF EXISTS trg_prevent_jurnal_baris_mutation ON jurnal_baris;
CREATE TRIGGER trg_prevent_jurnal_baris_mutation
BEFORE UPDATE OR DELETE ON jurnal_baris
FOR EACH ROW
EXECUTE FUNCTION trigger_prevent_journal_mutation();

-- 7. Line Consistency Validation Trigger
CREATE OR REPLACE FUNCTION trigger_validate_line_owner_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_header_owner_id uuid;
  v_account_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_header_owner_id
  FROM jurnal_umum
  WHERE id = NEW.journal_id;

  IF v_header_owner_id IS NULL OR v_header_owner_id <> NEW.owner_id THEN
    RAISE EXCEPTION 'jurnal_baris owner_id (%) does not match jurnal_umum owner_id (%)', NEW.owner_id, v_header_owner_id;
  END IF;

  SELECT owner_id INTO v_account_owner_id
  FROM accounts
  WHERE id = NEW.account_id;

  IF v_account_owner_id IS NULL OR v_account_owner_id <> NEW.owner_id THEN
    RAISE EXCEPTION 'jurnal_baris owner_id (%) does not match account owner_id (%)', NEW.owner_id, v_account_owner_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_line_owner_consistency ON jurnal_baris;
CREATE TRIGGER trg_validate_line_owner_consistency
BEFORE INSERT ON jurnal_baris
FOR EACH ROW
EXECUTE FUNCTION trigger_validate_line_owner_consistency();

-- 8. Apply Boilerplate Defaults
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'jurnal_umum'::regclass,
    'jurnal_baris'::regclass,
    'buku_pembantu'::regclass,
    'pending_actions'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;
