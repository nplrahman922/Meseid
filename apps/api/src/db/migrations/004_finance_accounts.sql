-- Migration: 004_finance_accounts.sql
-- Description: Chart of accounts templates, accounts, parties, and automatic account seeding.

-- 1. Default Accounts Template (Reference Data)
CREATE TABLE IF NOT EXISTS default_accounts_template (
  business_type text NOT NULL CHECK (business_type IN ('kuliner', 'toko', 'jasa', 'lainnya')),
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  is_cash boolean NOT NULL DEFAULT false,
  PRIMARY KEY (business_type, code)
);

-- Seed SAK EMKM Standard Accounts
INSERT INTO default_accounts_template (business_type, code, name, type, normal_balance, is_cash)
VALUES
  -- Kuliner
  ('kuliner', '1101', 'Kas Utama', 'asset', 'debit', true),
  ('kuliner', '1102', 'Bank Rekening Operasional', 'asset', 'debit', true),
  ('kuliner', '1103', 'Piutang Usaha', 'asset', 'debit', false),
  ('kuliner', '1104', 'Persediaan Bahan Makanan & Minuman', 'asset', 'debit', false),
  ('kuliner', '1201', 'Peralatan Dapur & Kafe', 'asset', 'debit', false),
  ('kuliner', '2101', 'Utang Usaha / Supplier', 'liability', 'credit', false),
  ('kuliner', '2102', 'Utang Gaji Karyawan', 'liability', 'credit', false),
  ('kuliner', '3101', 'Modal Pemilik', 'equity', 'credit', false),
  ('kuliner', '3201', 'Prive Pemilik', 'equity', 'debit', false),
  ('kuliner', '4101', 'Pendapatan Makanan & Minuman', 'revenue', 'credit', false),
  ('kuliner', '4201', 'Pendapatan Lain-lain', 'revenue', 'credit', false),
  ('kuliner', '5101', 'Beban Pokok Penjualan (Bahan Baku)', 'expense', 'debit', false),
  ('kuliner', '6101', 'Beban Gaji & Upah', 'expense', 'debit', false),
  ('kuliner', '6102', 'Beban Sewa Tempat', 'expense', 'debit', false),
  ('kuliner', '6103', 'Beban Listrik, Air & Gas', 'expense', 'debit', false),
  ('kuliner', '6104', 'Beban Operasional & Kebersihan', 'expense', 'debit', false),

  -- Toko
  ('toko', '1101', 'Kas Kasir Toko', 'asset', 'debit', true),
  ('toko', '1102', 'Bank Rekening Toko', 'asset', 'debit', true),
  ('toko', '1103', 'Piutang Usaha / Pelanggan', 'asset', 'debit', false),
  ('toko', '1104', 'Persediaan Barang Dagangan', 'asset', 'debit', false),
  ('toko', '1201', 'Rak & Perlengkapan Toko', 'asset', 'debit', false),
  ('toko', '2101', 'Utang Dagang / Supplier', 'liability', 'credit', false),
  ('toko', '3101', 'Modal Pemilik Toko', 'equity', 'credit', false),
  ('toko', '3201', 'Prive Pemilik', 'equity', 'debit', false),
  ('toko', '4101', 'Penjualan Barang Dagangan', 'revenue', 'credit', false),
  ('toko', '4201', 'Pendapatan Lain-lain', 'revenue', 'credit', false),
  ('toko', '5101', 'Harga Pokok Penjualan (HPP)', 'expense', 'debit', false),
  ('toko', '6101', 'Beban Gaji Karyawan Toko', 'expense', 'debit', false),
  ('toko', '6102', 'Beban Sewa Ruko', 'expense', 'debit', false),
  ('toko', '6103', 'Beban Listrik & Internet', 'expense', 'debit', false),
  ('toko', '6104', 'Beban Plastik & Kemasan', 'expense', 'debit', false),

  -- Jasa
  ('jasa', '1101', 'Kas Operasional Jasa', 'asset', 'debit', true),
  ('jasa', '1102', 'Bank Operasional Jasa', 'asset', 'debit', true),
  ('jasa', '1103', 'Piutang Jasa', 'asset', 'debit', false),
  ('jasa', '1104', 'Perlengkapan Habis Pakai', 'asset', 'debit', false),
  ('jasa', '1201', 'Peralatan Jasa', 'asset', 'debit', false),
  ('jasa', '2101', 'Utang Usaha', 'liability', 'credit', false),
  ('jasa', '3101', 'Modal Usaha Jasa', 'equity', 'credit', false),
  ('jasa', '3201', 'Prive Pemilik', 'equity', 'debit', false),
  ('jasa', '4101', 'Pendapatan Jasa Layanan', 'revenue', 'credit', false),
  ('jasa', '6101', 'Beban Gaji & Komisi', 'expense', 'debit', false),
  ('jasa', '6102', 'Beban Sewa Tempat', 'expense', 'debit', false),
  ('jasa', '6103', 'Beban Listrik & Komunikasi', 'expense', 'debit', false),
  ('jasa', '6104', 'Beban Operasional Lainnya', 'expense', 'debit', false),

  -- Lainnya
  ('lainnya', '1101', 'Kas Utama', 'asset', 'debit', true),
  ('lainnya', '1102', 'Bank Utama', 'asset', 'debit', true),
  ('lainnya', '1103', 'Piutang Usaha', 'asset', 'debit', false),
  ('lainnya', '1104', 'Persediaan / Perlengkapan', 'asset', 'debit', false),
  ('lainnya', '2101', 'Utang Usaha', 'liability', 'credit', false),
  ('lainnya', '3101', 'Modal Pemilik', 'equity', 'credit', false),
  ('lainnya', '3201', 'Prive Pemilik', 'equity', 'debit', false),
  ('lainnya', '4101', 'Pendapatan Usaha', 'revenue', 'credit', false),
  ('lainnya', '5101', 'Beban Pokok Pendapatan', 'expense', 'debit', false),
  ('lainnya', '6101', 'Beban Gaji', 'expense', 'debit', false),
  ('lainnya', '6102', 'Beban Operasional Umum', 'expense', 'debit', false)
ON CONFLICT (business_type, code) DO NOTHING;

-- 2. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  is_cash boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_accounts_owner_code UNIQUE (owner_id, code)
);

-- 3. Parties Table
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('customer', 'supplier')),
  name text NOT NULL,
  phone text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Function to Seed Default Accounts for New Owner
CREATE OR REPLACE FUNCTION seed_default_accounts(p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_btype text;
BEGIN
  SELECT business_type INTO v_btype FROM owners WHERE id = p_owner_id;
  IF v_btype IS NULL THEN
    v_btype := 'lainnya';
  END IF;

  INSERT INTO accounts (owner_id, code, name, type, normal_balance, is_cash, active)
  SELECT p_owner_id, code, name, type, normal_balance, is_cash, true
  FROM default_accounts_template
  WHERE business_type = v_btype
  ON CONFLICT (owner_id, code) DO NOTHING;
END;
$$;

-- Trigger hook on owners created
CREATE OR REPLACE FUNCTION on_owner_created_seed_accounts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM seed_default_accounts(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_accounts ON owners;
CREATE TRIGGER trg_seed_default_accounts
AFTER INSERT ON owners
FOR EACH ROW
EXECUTE FUNCTION on_owner_created_seed_accounts();

-- Backfill existing owners if any
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM owners LOOP
    PERFORM seed_default_accounts(r.id);
  END LOOP;
END;
$$;

-- 5. Apply Boilerplate Defaults
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'accounts'::regclass,
    'parties'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;
