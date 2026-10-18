-- Migration: 008_finance_reports.sql
-- Description: Financial security invoker views and reporting calculation functions.

-- 1. buku_besar (General Ledger Running Balance)
CREATE OR REPLACE VIEW buku_besar WITH (security_invoker = true) AS
SELECT 
  jb.id AS line_id,
  ju.id AS journal_id,
  ju.owner_id,
  ju.tx_date,
  ju.description AS journal_description,
  ju.source,
  ju.kind,
  a.id AS account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.type AS account_type,
  a.normal_balance,
  jb.debit,
  jb.credit,
  jb.memo,
  SUM(
    CASE 
      WHEN a.normal_balance = 'debit' THEN (jb.debit - jb.credit)
      ELSE (jb.credit - jb.debit)
    END
  ) OVER (
    PARTITION BY jb.owner_id, jb.account_id 
    ORDER BY ju.tx_date, ju.created_at, jb.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_balance,
  ju.created_at
FROM jurnal_baris jb
JOIN jurnal_umum ju ON ju.id = jb.journal_id
JOIN accounts a ON a.id = jb.account_id;

-- 2. neraca_saldo (Trial Balance)
CREATE OR REPLACE VIEW neraca_saldo WITH (security_invoker = true) AS
SELECT 
  a.owner_id,
  a.id AS account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.type AS account_type,
  a.normal_balance,
  COALESCE(SUM(jb.debit), 0.00) AS total_debit,
  COALESCE(SUM(jb.credit), 0.00) AS total_credit,
  CASE 
    WHEN a.normal_balance = 'debit' THEN 
      COALESCE(SUM(jb.debit - jb.credit), 0.00)
    ELSE 
      COALESCE(SUM(jb.credit - jb.debit), 0.00)
  END AS ending_balance
FROM accounts a
LEFT JOIN jurnal_baris jb ON jb.account_id = a.id
GROUP BY a.owner_id, a.id, a.code, a.name, a.type, a.normal_balance;

-- 3. buku_kas (Cash Book)
CREATE OR REPLACE VIEW buku_kas WITH (security_invoker = true) AS
SELECT 
  jb.id AS line_id,
  ju.id AS journal_id,
  ju.owner_id,
  ju.tx_date,
  ju.description AS transaction_description,
  a.code AS cash_account_code,
  a.name AS cash_account_name,
  jb.debit AS cash_in,
  jb.credit AS cash_out,
  jb.memo,
  SUM(jb.debit - jb.credit) OVER (
    PARTITION BY jb.owner_id, jb.account_id 
    ORDER BY ju.tx_date, ju.created_at, jb.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cash_balance,
  ju.created_at
FROM jurnal_baris jb
JOIN jurnal_umum ju ON ju.id = jb.journal_id
JOIN accounts a ON a.id = jb.account_id
WHERE a.is_cash = true;

-- 4. subledger_aging (Aging Utang / Piutang)
CREATE OR REPLACE VIEW subledger_aging WITH (security_invoker = true) AS
SELECT 
  bp.id AS subledger_id,
  bp.owner_id,
  p.id AS party_id,
  p.name AS party_name,
  p.type AS party_type,
  bp.due_date,
  bp.amount,
  bp.settled_amount,
  (bp.amount - bp.settled_amount) AS outstanding_amount,
  bp.status,
  CASE 
    WHEN bp.due_date IS NULL OR bp.due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - bp.due_date BETWEEN 1 AND 30 THEN '1-30 days'
    WHEN CURRENT_DATE - bp.due_date BETWEEN 31 AND 60 THEN '31-60 days'
    ELSE '60+ days'
  END AS aging_bucket
FROM buku_pembantu bp
JOIN parties p ON p.id = bp.party_id
WHERE bp.status IN ('unpaid', 'partially_paid', 'overdue');

-- 5. fn_income_statement (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION fn_income_statement(
  p_owner_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE (
  account_code text,
  account_name text,
  account_type text,
  amount numeric(18,2)
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NULLIF(current_setting('role', true), 'none') = 'meseid_owner_ctx' AND p_owner_id IS DISTINCT FROM app_owner_id() THEN
    RAISE EXCEPTION 'Access denied: caller does not match owner_id';
  END IF;

  RETURN QUERY
  SELECT 
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    CASE 
      WHEN a.type = 'revenue' THEN COALESCE(SUM(jb.credit - jb.debit), 0.00)
      WHEN a.type = 'expense' THEN COALESCE(SUM(jb.debit - jb.credit), 0.00)
      ELSE 0.00
    END AS amount
  FROM accounts a
  LEFT JOIN (
    jurnal_baris jb
    JOIN jurnal_umum ju ON ju.id = jb.journal_id AND ju.tx_date BETWEEN p_from AND p_to
  ) ON jb.account_id = a.id
  WHERE a.owner_id = p_owner_id 
    AND a.type IN ('revenue', 'expense')
  GROUP BY a.id, a.code, a.name, a.type
  ORDER BY a.type DESC, a.code ASC;
END;
$$;

-- 6. fn_balance_sheet (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION fn_balance_sheet(
  p_owner_id uuid,
  p_as_of date
)
RETURNS TABLE (
  account_code text,
  account_name text,
  account_type text,
  amount numeric(18,2)
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NULLIF(current_setting('role', true), 'none') = 'meseid_owner_ctx' AND p_owner_id IS DISTINCT FROM app_owner_id() THEN
    RAISE EXCEPTION 'Access denied: caller does not match owner_id';
  END IF;

  RETURN QUERY
  SELECT 
    a.code AS account_code,
    a.name AS account_name,
    a.type AS account_type,
    CASE 
      WHEN a.type = 'asset' THEN COALESCE(SUM(jb.debit - jb.credit), 0.00)
      WHEN a.type IN ('liability', 'equity') THEN COALESCE(SUM(jb.credit - jb.debit), 0.00)
      ELSE 0.00
    END AS amount
  FROM accounts a
  LEFT JOIN (
    jurnal_baris jb
    JOIN jurnal_umum ju ON ju.id = jb.journal_id AND ju.tx_date <= p_as_of
  ) ON jb.account_id = a.id
  WHERE a.owner_id = p_owner_id 
    AND a.type IN ('asset', 'liability', 'equity')
  GROUP BY a.id, a.code, a.name, a.type
  ORDER BY a.type ASC, a.code ASC;
END;
$$;
