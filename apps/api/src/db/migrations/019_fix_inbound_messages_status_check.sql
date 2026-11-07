-- Migration: 019_fix_inbound_messages_status_check.sql
-- Description: Align inbound_messages status check constraint with runtime life-cycle (processing, done, failed, duplicate)

ALTER TABLE inbound_messages DROP CONSTRAINT IF EXISTS inbound_messages_status_check;
ALTER TABLE inbound_messages ADD CONSTRAINT inbound_messages_status_check 
  CHECK (status IN ('received', 'processing', 'processed', 'done', 'failed', 'duplicate'));
ALTER TABLE inbound_messages ALTER COLUMN status SET DEFAULT 'processing';
