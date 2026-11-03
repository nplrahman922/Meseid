-- Migration: 019_conversation_history.sql
-- Description: Multi-turn conversation messages storage with 6-layer isolation matrix.

CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq bigserial UNIQUE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  sender_id text NOT NULL,
  is_owner boolean NOT NULL DEFAULT false,
  persona text NOT NULL CHECK (persona IN ('admin', 'assistant')),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_lookup 
ON conversation_messages (owner_id, channel, sender_id, is_owner, seq DESC);

-- Terapkan standar keamanan RLS multi-tenant Meseid
DO $$
BEGIN
  CALL util_apply_tenant_defaults('conversation_messages'::regclass);
  CALL util_create_owner_policy('conversation_messages'::regclass);
END;
$$;

DROP POLICY IF EXISTS system_ctx_conversation_messages ON conversation_messages;
CREATE POLICY system_ctx_conversation_messages ON conversation_messages
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_messages TO meseid_owner_ctx, meseid_system_ctx, meseid_app;
GRANT USAGE, SELECT ON SEQUENCE conversation_messages_seq_seq TO meseid_owner_ctx, meseid_system_ctx, meseid_app;

