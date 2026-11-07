import { Tx } from "../../../../db/client";
import { UnansweredQuestionRecord } from "./list-unanswered-questions.action";

/**
 * Operasi Menandai pertanyaan belum terjawab sebagai telah terpecahkan (resolved = true),
 * serta menautkannya dengan ID entri Knowledge Base yang baru dibuat (opsional).
 */
export async function resolveUnansweredQuestionAction(
  tx: Tx,
  ownerId: string,
  questionId: string,
  resolvedByKbId?: string | null
): Promise<UnansweredQuestionRecord | null> {
  const kbId = resolvedByKbId ? resolvedByKbId : null;
  const [row] = await tx<UnansweredQuestionRecord[]>`
    UPDATE unanswered_questions
    SET resolved = true,
        resolved_by_kb_id = ${kbId},
        updated_at = now()
    WHERE owner_id = ${ownerId}::uuid
      AND id = ${questionId}::uuid
    RETURNING id, owner_id, question_text, times_asked, resolved, resolved_by_kb_id, created_at, updated_at;
  `;

  return row || null;
}
