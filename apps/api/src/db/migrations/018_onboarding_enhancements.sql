-- Migration: 018_onboarding_enhancements.sql
-- Description: Add phone, custom business type, business description, and onboarding status to owners,
--              add is_internal to knowledge_base, and drop rigid category check constraint.

-- 1. Alter owners table
ALTER TABLE owners ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS custom_business_type text;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS business_description text;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. Alter knowledge_base table
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;
ALTER TABLE knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_category_check;

-- 3. Ensure role permissions on newly updated tables
GRANT SELECT, UPDATE ON owners TO meseid_owner_ctx;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_base TO meseid_owner_ctx;
GRANT SELECT ON owners, knowledge_base TO meseid_system_ctx;
