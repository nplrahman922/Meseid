import { Tx } from "../../../../db/client";

export interface UnansweredQuestionRecord {
  id: string;
  owner_id: string;
  question_text: string;
  times_asked: number;
  resolved: boolean;
  resolved_by_kb_id: string | null;
  channel?: string;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Operasi List Unanswered Questions untuk owner tertentu.
 * Mengambil pertanyaan pelanggan yang belum terjawab (default: resolved = false).
 */
export async function listUnansweredQuestionsAction(
  tx: Tx,
  ownerId: string,
  filter?: { resolved?: boolean }
): Promise<UnansweredQuestionRecord[]> {
  const resolvedFilter = filter?.resolved !== undefined ? filter.resolved : false;

  return await tx<UnansweredQuestionRecord[]>`
    SELECT id, owner_id, question_text, times_asked, resolved, resolved_by_kb_id, channel, rejection_reason, created_at, updated_at
    FROM unanswered_questions
    WHERE owner_id = ${ownerId}::uuid
      AND resolved = ${resolvedFilter}
    ORDER BY times_asked DESC, created_at DESC;
  `;
}
