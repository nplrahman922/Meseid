-- Migration: 007_finance_functions.sql
-- Description: Core finance execution functions (SECURITY INVOKER with owner validation).

-- 1. fn_post_journal (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION fn_post_journal(
  p_owner_id uuid,
  p_header jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_journal_id uuid;
  v_tx_date date;
  v_description text;
  v_source text;
  v_source_ref text;
  v_kind text;
  v_created_by uuid;
  v_line jsonb;
  v_line_id uuid;
  v_account_id uuid;
  v_debit numeric(18,2);
  v_credit numeric(18,2);
  v_memo text;
  v_party_id uuid;
  v_due_date date;
  v_line_amount numeric(18,2);
  v_sum_debit numeric(18,2);
  v_sum_credit numeric(18,2);
  v_caller_role text;
BEGIN
  v_caller_role := COALESCE(NULLIF(current_setting('role', true), 'none'), SESSION_USER);
  -- Caller Guard: Owner cannot post journals for another owner
  IF v_caller_role = 'meseid_owner_ctx' AND p_owner_id IS DISTINCT FROM app_owner_id() THEN
    RAISE EXCEPTION 'Access denied: caller does not match owner_id';
  END IF;

  v_tx_date := COALESCE((p_header->>'tx_date')::date, CURRENT_DATE);
  v_description := p_header->>'description';
  v_source := COALESCE(p_header->>'source', 'manual');
  v_source_ref := p_header->>'source_ref';
  v_kind := COALESCE(p_header->>'kind', 'normal');
  v_created_by := COALESCE(app_user_id(), NULLIF(p_header->>'created_by', '')::uuid);

  IF v_description IS NULL OR trim(v_description) = '' THEN
    RAISE EXCEPTION 'Journal description is required';
  END IF;

  IF jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'Journal must contain at least 2 lines';
  END IF;

  -- 1. Insert header
  INSERT INTO jurnal_umum (
    owner_id, tx_date, description, source, source_ref, kind, created_by
  )
  VALUES (
    p_owner_id, v_tx_date, v_description, v_source, v_source_ref, v_kind, v_created_by
  )
  RETURNING id INTO v_journal_id;

  -- 2. Insert lines and associated subledgers
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_account_id := (v_line->>'account_id')::uuid;
    v_debit := COALESCE((v_line->>'debit')::numeric(18,2), 0.00);
    v_credit := COALESCE((v_line->>'credit')::numeric(18,2), 0.00);
    v_memo := v_line->>'memo';
    v_party_id := NULLIF(v_line->>'party_id', '')::uuid;
    v_due_date := (v_line->>'due_date')::date;

    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'Line account_id cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = v_account_id AND owner_id = p_owner_id) THEN
      RAISE EXCEPTION 'Account % does not belong to owner % or does not exist', v_account_id, p_owner_id;
    END IF;

    INSERT INTO jurnal_baris (
      journal_id, owner_id, account_id, debit, credit, memo
    )
    VALUES (
      v_journal_id, p_owner_id, v_account_id, v_debit, v_credit, v_memo
    )
    RETURNING id INTO v_line_id;

    IF v_party_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM parties WHERE id = v_party_id AND owner_id = p_owner_id) THEN
        RAISE EXCEPTION 'Party % does not belong to owner % or does not exist', v_party_id, p_owner_id;
      END IF;

      v_line_amount := GREATEST(v_debit, v_credit);
      INSERT INTO buku_pembantu (
        owner_id, party_id, journal_line_id, due_date, amount, settled_amount, status
      )
      VALUES (
        p_owner_id, v_party_id, v_line_id, v_due_date, v_line_amount, 0.00, 'unpaid'
      );
    END IF;
  END LOOP;

  -- Verify line sum balances before returning
  SELECT COALESCE(SUM(debit), 0.00), COALESCE(SUM(credit), 0.00)
  INTO v_sum_debit, v_sum_credit
  FROM jurnal_baris
  WHERE journal_id = v_journal_id;

  IF v_sum_debit <> v_sum_credit OR v_sum_debit <= 0 THEN
    RAISE EXCEPTION 'Journal % lines are unbalanced: debit (%) != credit (%)', v_journal_id, v_sum_debit, v_sum_credit;
  END IF;

  RETURN v_journal_id;
END;
$$;

-- 2. fn_reverse_journal (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION fn_reverse_journal(
  p_owner_id uuid,
  p_target_journal_id uuid,
  p_reason text DEFAULT 'Correction reversal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_orig_journal RECORD;
  v_reversal_id uuid;
  v_line RECORD;
  v_caller_role text;
BEGIN
  v_caller_role := COALESCE(NULLIF(current_setting('role', true), 'none'), SESSION_USER);
  -- Caller Guard
  IF v_caller_role = 'meseid_owner_ctx' AND p_owner_id IS DISTINCT FROM app_owner_id() THEN
    RAISE EXCEPTION 'Access denied: caller does not match owner_id';
  END IF;

  SELECT * INTO v_orig_journal
  FROM jurnal_umum
  WHERE id = p_target_journal_id AND owner_id = p_owner_id;

  IF v_orig_journal.id IS NULL THEN
    RAISE EXCEPTION 'Journal % not found for owner %', p_target_journal_id, p_owner_id;
  END IF;

  IF v_orig_journal.kind = 'reversal' THEN
    RAISE EXCEPTION 'Cannot reverse an existing reversal journal %', p_target_journal_id;
  END IF;

  IF EXISTS (SELECT 1 FROM jurnal_umum WHERE reverses_journal_id = p_target_journal_id) THEN
    RAISE EXCEPTION 'Journal % has already been reversed', p_target_journal_id;
  END IF;

  -- Reject reversal if linked buku_pembantu has settled_amount > 0
  IF EXISTS (
    SELECT 1 FROM buku_pembantu bp
    JOIN jurnal_baris jb ON jb.id = bp.journal_line_id
    WHERE jb.journal_id = p_target_journal_id
      AND bp.settled_amount > 0
  ) THEN
    RAISE EXCEPTION 'Cannot reverse journal % with partially or fully settled subledger. Reverse settlement journals first.', p_target_journal_id;
  END IF;

  -- Void linked unsettled subledgers
  UPDATE buku_pembantu bp
  SET status = 'voided',
      updated_at = now()
  FROM jurnal_baris jb
  WHERE jb.id = bp.journal_line_id
    AND jb.journal_id = p_target_journal_id;

  INSERT INTO jurnal_umum (
    owner_id, tx_date, description, source, source_ref, kind, reverses_journal_id
  )
  VALUES (
    p_owner_id,
    CURRENT_DATE,
    'Reversal of journal ' || p_target_journal_id || ': ' || COALESCE(p_reason, 'Correction'),
    v_orig_journal.source,
    v_orig_journal.id::text,
    'reversal',
    p_target_journal_id
  )
  RETURNING id INTO v_reversal_id;

  FOR v_line IN 
    SELECT * FROM jurnal_baris WHERE journal_id = p_target_journal_id ORDER BY id
  LOOP
    INSERT INTO jurnal_baris (
      journal_id, owner_id, account_id, debit, credit, memo
    )
    VALUES (
      v_reversal_id,
      p_owner_id,
      v_line.account_id,
      v_line.credit,
      v_line.debit,
      'Reversal of line ' || v_line.id
    );
  END LOOP;

  RETURN v_reversal_id;
END;
$$;

-- 3. fn_confirm_pending_action (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION fn_confirm_pending_action(p_action_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_action RECORD;
  v_journal_id uuid;
  v_caller_role text;
BEGIN
  v_caller_role := COALESCE(NULLIF(current_setting('role', true), 'none'), current_user);

  SELECT * INTO v_action
  FROM pending_actions
  WHERE id = p_action_id
  FOR UPDATE;

  IF v_action.id IS NULL THEN
    RAISE EXCEPTION 'Pending action % not found', p_action_id;
  END IF;

  -- Caller Guard
  IF v_caller_role = 'meseid_owner_ctx' AND v_action.owner_id IS DISTINCT FROM app_owner_id() THEN
    RAISE EXCEPTION 'Access denied: caller does not match owner_id';
  END IF;

  IF v_action.status = 'confirmed' THEN
    RETURN jsonb_build_object(
      'status', 'already_confirmed',
      'action_id', p_action_id
    );
  END IF;

  IF v_action.status = 'cancelled' THEN
    RAISE EXCEPTION 'Pending action % has already been cancelled', p_action_id;
  END IF;

  IF v_action.status = 'expired' OR v_action.expires_at < now() THEN
    UPDATE pending_actions SET status = 'expired', updated_at = now() WHERE id = p_action_id;
    RAISE EXCEPTION 'Pending action % has expired', p_action_id;
  END IF;

  IF v_action.type = 'post_journal' THEN
    v_journal_id := fn_post_journal(
      v_action.owner_id,
      v_action.payload->'header',
      v_action.payload->'lines'
    );

    UPDATE pending_actions 
    SET status = 'confirmed', updated_at = now()
    WHERE id = p_action_id;

    RETURN jsonb_build_object(
      'status', 'confirmed',
      'action_id', p_action_id,
      'journal_id', v_journal_id
    );
  ELSE
    RAISE EXCEPTION 'Unknown pending action type: %', v_action.type;
  END IF;
END;
$$;
