import type { QuizSession } from '@/types';

/**
 * A quiz is "active" only when the current time falls inside its
 * `waktu_mulai` / `waktu_selesai` window. There is no manual admin toggle —
 * the time window is the single source of truth.
 *
 * Time fields arrive from the DB as 'YYYY-MM-DD HH:mm:ss' — parsed as local
 * time by replacing the space with 'T'.
 */
export function isQuizActive(
  quiz?: Pick<QuizSession, 'waktu_mulai' | 'waktu_selesai'> | null,
): boolean {
  if (!quiz) return false;

  const start = quiz.waktu_mulai ? new Date(String(quiz.waktu_mulai).replace(' ', 'T')) : null;
  const end = quiz.waktu_selesai ? new Date(String(quiz.waktu_selesai).replace(' ', 'T')) : null;
  const now = new Date();

  if (start && end) return now >= start && now <= end;
  if (end) return now <= end;   // open-ended start
  if (start) return now >= start; // open-ended end
  return false; // no window = never active
}
