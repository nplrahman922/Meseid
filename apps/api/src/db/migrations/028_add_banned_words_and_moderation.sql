-- ==============================================================================
-- Migrasi 028: Tambah Banned Words & Pengaturan Moderasi Grup ke bot_configs
-- ==============================================================================
-- Menangani:
-- 1. Kata terlarang kustom pilihan owner (banned_words) dalam format JSON array.
-- 2. Toggle saklar fitur moderasi grup (group_moderation_enabled).
-- 3. Menambahkan enum 'moderation_violation' pada tabel unanswered_questions.
--
-- Isolasi ketat: Non-destruktif, tidak menyentuh atau menghapus data eksisting.
-- ==============================================================================

ALTER TABLE bot_configs
  ADD COLUMN IF NOT EXISTS banned_words jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS group_moderation_enabled boolean NOT NULL DEFAULT true;

-- Update check constraint pada unanswered_questions secara aman
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unanswered_questions_rejection_reason_check'
  ) THEN
    ALTER TABLE unanswered_questions DROP CONSTRAINT unanswered_questions_rejection_reason_check;
  END IF;

  ALTER TABLE unanswered_questions
    ADD CONSTRAINT unanswered_questions_rejection_reason_check
    CHECK (rejection_reason IN (
      'missing_kb', 'jailbreak', 'leakage', 'out_of_scope', 
      'fallback', 'ambiguous', 'moderation_violation'
    ));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
