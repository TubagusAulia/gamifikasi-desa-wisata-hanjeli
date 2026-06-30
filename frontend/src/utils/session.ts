import type { QuizSession } from '@/types';

/**
 * A quiz is "available" (active) when either:
 *  - it was manually forced active via the admin activate toggle (`status === 'active'`), OR
 *  - the current time falls inside its `waktu_mulai` / `waktu_selesai` window.
 *
 * The manual flag wins so the existing activate button keeps working; `completed` never counts.
 * Time fields arrive from the DB as 'YYYY-MM-DD HH:mm:ss' — parsing as local time by replacing
 * the space with 'T'.
 */
export function isQuizActive(
  quiz?: Pick<QuizSession, 'status' | 'waktu_mulai' | 'waktu_selesai'> | null,
): boolean {
  if (!quiz) return false;

  // Explicit manual override takes precedence.
  if (quiz.status === 'active' || quiz.status === 'completed') return quiz.status === 'active';

  const start = quiz.waktu_mulai ? new Date(String(quiz.waktu_mulai).replace(' ', 'T')) : null;
  const end = quiz.waktu_selesai ? new Date(String(quiz.waktu_selesai).replace(' ', 'T')) : null;
  const now = new Date();

  if (start && end) return now >= start && now <= end;
  if (end) return now <= end; // open-ended start
  if (start) return now >= start; // open-ended end
  return false; // no window + not manually active
}
