-- Migration: 013_documents_scheduling.sql
-- Description: Google Drive document metadata, schedules with GiST exclusion, bookings, and reminders.

-- 1. Documents (Drive Metadata Only - No Raw Binary Files in DB)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('laporan', 'struk', 'lainnya')),
  title text NOT NULL,
  drive_file_id text NOT NULL,
  mime text NOT NULL DEFAULT 'application/pdf',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  drive_revision_id text,
  checksum text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_doc_version UNIQUE (document_id, version_no)
);

-- Auto-increment version_no trigger
CREATE OR REPLACE FUNCTION trigger_set_document_version_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.version_no IS NULL OR NEW.version_no <= 0 THEN
    SELECT COALESCE(MAX(version_no), 0) + 1 INTO NEW.version_no
    FROM document_versions
    WHERE document_id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_document_version_no ON document_versions;
CREATE TRIGGER trg_set_document_version_no
BEFORE INSERT ON document_versions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_document_version_no();

-- 3. Schedules (Google Calendar Mirror with GiST Exclusion)
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  google_event_id text,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'tentative')),
  source text NOT NULL CHECK (source IN ('chat', 'booking', 'dashboard')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_schedule_dates CHECK (end_at > start_at),
  CONSTRAINT uq_schedules_owner_google_event UNIQUE (owner_id, google_event_id),
  CONSTRAINT exclude_overlapping_confirmed_schedules EXCLUDE USING gist (
    owner_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status = 'confirmed')
);

-- Conflict Detection Function (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION fn_check_conflict(
  p_owner_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_user = 'meseid_owner_ctx' AND p_owner_id IS DISTINCT FROM app_owner_id() THEN
    RAISE EXCEPTION 'Access denied: caller does not match owner_id';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM schedules
    WHERE owner_id = p_owner_id
      AND status = 'confirmed'
      AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start, p_end, '[)')
  );
END;
$$;

-- 4. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  service_name text NOT NULL,
  requested_start_at timestamptz NOT NULL,
  requested_end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  schedule_id uuid REFERENCES schedules(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  recipient text NOT NULL,
  remind_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Apply Boilerplate Defaults
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents'::regclass,
    'document_versions'::regclass,
    'schedules'::regclass,
    'bookings'::regclass,
    'reminders'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;

-- 7. Policies & Grants
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents'::regclass,
    'schedules'::regclass,
    'bookings'::regclass,
    'reminders'::regclass
  ]) LOOP
    CALL util_create_owner_policy(t);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS owner_ctx_document_versions ON document_versions;
CREATE POLICY owner_ctx_document_versions ON document_versions FOR ALL TO meseid_owner_ctx
  USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.owner_id = (SELECT app_owner_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.owner_id = (SELECT app_owner_id())));

DROP POLICY IF EXISTS system_ctx_schedules ON schedules;
CREATE POLICY system_ctx_schedules ON schedules FOR ALL TO meseid_system_ctx USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_bookings ON bookings;
CREATE POLICY system_ctx_bookings ON bookings FOR ALL TO meseid_system_ctx USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_reminders ON reminders;
CREATE POLICY system_ctx_reminders ON reminders FOR ALL TO meseid_system_ctx USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON documents, document_versions, schedules, bookings, reminders TO meseid_owner_ctx;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedules, bookings, reminders TO meseid_system_ctx;

REVOKE ALL ON FUNCTION fn_check_conflict(uuid, timestamptz, timestamptz) FROM PUBLIC, meseid_app;
GRANT EXECUTE ON FUNCTION fn_check_conflict(uuid, timestamptz, timestamptz) TO meseid_owner_ctx, meseid_system_ctx;
