import { Tx } from "../../../../db/client";

export type RejectionReason =
  | "missing_kb"
  | "jailbreak"
  | "leakage"
  | "out_of_scope"
  | "fallback"
  | "ambiguous";

export interface RecordUnansweredQuestionOptions {
  channel?: "whatsapp" | "telegram" | string;
  reason?: RejectionReason;
}

/**
 * Operasi Pencatatan Pertanyaan Belum Terjawab atau Pertanyaan yang Ditolak oleh AI Guard.
 * Mendukung deduplikasi otomatis: jika pertanyaan serupa (case-insensitive & trimmed)
 * telah ada dan belum resolved, frekuensi times_asked akan dinaikkan.
 */
export async function recordUnansweredQuestionAction(
  tx: Tx,
  ownerId: string,
  questionText: string,
  options?: RecordUnansweredQuestionOptions
): Promise<void> {
  const cleanQuestion = questionText.trim();
  if (cleanQuestion.length < 2 || cleanQuestion.length > 1000) {
    return;
  }

  const channel = options?.channel === "telegram" ? "telegram" : "whatsapp";
  const reason: RejectionReason = options?.reason || "missing_kb";

  // 1. Cek apakah pertanyaan serupa sudah pernah ditanyakan dan belum resolved
  const [existing] = await tx<{ id: string; times_asked: number }[]>`
    SELECT id, times_asked
    FROM unanswered_questions
    WHERE owner_id = ${ownerId}::uuid
      AND resolved = false
      AND LOWER(TRIM(question_text)) = LOWER(${cleanQuestion})
    LIMIT 1;
  `;

  if (existing) {
    // 2. Naikkan frekuensi times_asked dan perbarui timestamp
    await tx`
      UPDATE unanswered_questions
      SET times_asked = times_asked + 1,
          rejection_reason = ${reason},
          channel = ${channel},
          updated_at = now()
      WHERE id = ${existing.id}::uuid;
    `;
  } else {
    // 3. Masukkan entri baru dengan times_asked = 1
    await tx`
      INSERT INTO unanswered_questions (
        owner_id, question_text, times_asked, resolved, channel, rejection_reason
      )
      VALUES (
        ${ownerId}::uuid, ${cleanQuestion}, 1, false, ${channel}, ${reason}
      );
    `;
  }
}
