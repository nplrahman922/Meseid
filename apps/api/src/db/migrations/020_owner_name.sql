-- Migration: 020_owner_name.sql
-- Description: Add owner_name column to owners table to store user display name from onboarding.

-- 1. Alter owners table
ALTER TABLE owners ADD COLUMN IF NOT EXISTS owner_name text;

-- 2. Ensure role permissions on owners table
GRANT SELECT, UPDATE ON owners TO meseid_owner_ctx;
GRANT SELECT ON owners TO meseid_system_ctx;
