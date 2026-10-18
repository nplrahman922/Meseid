-- Migration: 002_tenancy.sql
-- Description: Core identity and multi-tenant schema tables.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text NOT NULL UNIQUE,
  email citext NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('owner', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Owners Table
CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('kuliner', 'toko', 'jasa', 'lainnya')),
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  suspended_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Google Connections
CREATE TABLE IF NOT EXISTS google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES owners(id) ON DELETE CASCADE,
  scopes text[] NOT NULL DEFAULT '{}',
  refresh_token_enc bytea,
  access_token_enc bytea,
  token_expires_at timestamptz,
  calendar_id text,
  drive_root_folder_id text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'revoked', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Channel Connections
CREATE TABLE IF NOT EXISTS channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  external_account_id text NOT NULL,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  session_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_channel_account UNIQUE (channel, external_account_id)
);

-- 5. Bot Configs
CREATE TABLE IF NOT EXISTS bot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES owners(id) ON DELETE CASCADE,
  persona_prompt text,
  auto_reply_enabled boolean NOT NULL DEFAULT true,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'faq' CHECK (category IN ('faq', 'produk', 'operasional', 'kebijakan')),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Apply Boilerplate Defaults (Triggers and RLS enforcement)
DO $$
DECLARE
  t regclass;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users'::regclass,
    'owners'::regclass,
    'google_connections'::regclass,
    'channel_connections'::regclass,
    'bot_configs'::regclass,
    'knowledge_base'::regclass
  ]) LOOP
    CALL util_apply_tenant_defaults(t);
  END LOOP;
END;
$$;
