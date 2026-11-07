-- Migration: 027_enhance_unanswered_questions.sql
-- Description: Menambahkan metadata saluran (channel) dan alasan penolakan (rejection_reason)
--              pada tabel unanswered_questions secara non-destruktif.

ALTER TABLE unanswered_questions
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'telegram')),
  ADD COLUMN IF NOT EXISTS rejection_reason text NOT NULL DEFAULT 'missing_kb'
    CHECK (rejection_reason IN ('missing_kb', 'jailbreak', 'leakage', 'out_of_scope', 'fallback', 'ambiguous'));

CREATE INDEX IF NOT EXISTS idx_unanswered_questions_owner_resolved
  ON unanswered_questions (owner_id, resolved);
