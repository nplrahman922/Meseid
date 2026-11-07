-- ==============================================================================
-- Migrasi 026: Tabel channel_access_rules untuk Hak Akses Grup, Kontak & Blacklist
-- ==============================================================================
-- Menangani:
-- 1. Deteksi otomatis nomor dan grup di WhatsApp & Telegram.
-- 2. Hak akses multi-kanal: Active, Disabled, dan Blocked (Blacklist).
-- 3. Persona khusus grup: Asisten Bisnis vs Admin Toko.
-- 4. Ringkasan analisis perilaku AI (Nemotron Free / Model Pro).
--
-- Isolasi ketat: Tidak menyentuh atau menghapus data bot_configs atau knowledge_base eksisting.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS channel_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  target_type text NOT NULL CHECK (target_type IN ('number', 'group')),
  target_id text NOT NULL,
  target_name text NOT NULL,
  custom_label text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'blocked')),
  persona_mode text NOT NULL DEFAULT 'admin' CHECK (persona_mode IN ('assistant', 'admin')),
  trigger_mode text NOT NULL DEFAULT 'mention_or_reply' CHECK (trigger_mode IN ('mention_or_reply', 'always')),
  behavior_summary text,
  behavior_analyzed_at timestamptz,
  last_interaction_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_owner_channel_target UNIQUE (owner_id, channel, target_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_access_lookup ON channel_access_rules(owner_id, channel, target_id);
CREATE INDEX IF NOT EXISTS idx_channel_access_status ON channel_access_rules(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_channel_access_type ON channel_access_rules(owner_id, target_type);

-- Terapkan RLS Multi-Tenant Meseid
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'util_apply_tenant_defaults') THEN
    CALL util_apply_tenant_defaults('channel_access_rules'::regclass);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'util_create_owner_policy') THEN
    CALL util_create_owner_policy('channel_access_rules'::regclass);
  END IF;
END;
$$;

-- Kebijakan Policy RLS untuk background webhook / message processor
DROP POLICY IF EXISTS system_ctx_channel_access_rules ON channel_access_rules;
CREATE POLICY system_ctx_channel_access_rules ON channel_access_rules
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

-- Izin Hak Akses Konteks Runtime Meseid
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_access_rules TO meseid_owner_ctx, meseid_system_ctx, meseid_app;

