-- Migration: 014_ingestion_chat.sql
-- Description: Inbound message ingestion idempotency, chat logs summaries, and unanswered questions.

-- 1. Inbound Messages (Webhook Idempotency)
CREATE TABLE IF NOT EXISTS inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  external_message_id text NOT NULL,
  owner_id uuid REFERENCES owners(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  payload_hash text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'duplicate', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_inbound_channel_msg UNIQUE (channel, external_message_id)
);

-- 2. Chat Logs (Aggregated Summaries - No Raw Prompt/Responses)
CREATE TABLE IF NOT EXISTS chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  external_sender_id text NOT NULL,
  summary text NOT NULL,
  intent text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Unanswered Questions (Auto-routed for Owner Feedback)
CREATE TABLE IF NOT EXISTS unanswered_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  times_asked integer NOT NULL DEFAULT 1,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by_kb_id uuid REFERENCES knowledge_base(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Channel Link Codes (Account Linking OTP - SRS FR-31)
CREATE TABLE IF NOT EXISTS channel_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  target_external_id text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Apply Boilerplate Defaults
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'inbound_messages'::regclass,
    'chat_logs'::regclass,
    'unanswered_questions'::regclass,
    'channel_link_codes'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;

-- 6. Policies & Grants
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'chat_logs'::regclass,
    'unanswered_questions'::regclass,
    'channel_link_codes'::regclass
  ]) LOOP
    CALL util_create_owner_policy(t);
  END LOOP;
END;
$$;

-- Inbound messages owner policy (optional owner inspection)
DROP POLICY IF EXISTS owner_ctx_inbound_messages ON inbound_messages;
CREATE POLICY owner_ctx_inbound_messages ON inbound_messages
  FOR SELECT TO meseid_owner_ctx
  USING (owner_id = (SELECT app_owner_id()));

-- System context policies (Webhook ingestion and message pipeline)
DROP POLICY IF EXISTS system_ctx_inbound_messages ON inbound_messages;
CREATE POLICY system_ctx_inbound_messages ON inbound_messages
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_chat_logs ON chat_logs;
CREATE POLICY system_ctx_chat_logs ON chat_logs
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_unanswered_questions ON unanswered_questions;
CREATE POLICY system_ctx_unanswered_questions ON unanswered_questions
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS system_ctx_channel_link_codes ON channel_link_codes;
CREATE POLICY system_ctx_channel_link_codes ON channel_link_codes
  FOR ALL TO meseid_system_ctx
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT ON chat_logs, unanswered_questions, inbound_messages TO meseid_owner_ctx;
GRANT UPDATE, DELETE ON unanswered_questions TO meseid_owner_ctx;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_link_codes TO meseid_owner_ctx;

GRANT SELECT, INSERT, UPDATE, DELETE ON inbound_messages, chat_logs, unanswered_questions TO meseid_system_ctx;
GRANT SELECT, UPDATE ON channel_link_codes TO meseid_system_ctx;
