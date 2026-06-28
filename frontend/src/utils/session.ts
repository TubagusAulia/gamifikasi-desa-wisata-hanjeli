import type { QuizSession } from '@/types';

/**
 * A sesi is "available" (active) when either:
 *  - it was manually forced active via the admin activate toggle (`status === 'active'`), OR
 *  - the current time falls inside its `waktu_mulai` / `waktu_selesai` window.
 *
 * The manual flag wins so the existing activate button keeps working; `completed` never counts.
 * Time fields arrive from the DB as 'YYYY-MM-DD HH:mm:ss' — parsing as local time by replacing
 * the space with 'T'.
 */
export function isSessionActive(
  sesi?: Pick<QuizSession, 'status' | 'waktu_mulai' | 'waktu_selesai'> | null,
): boolean {
  if (!sesi) return false;

  // Explicit manual override takes precedence.
  if (sesi.status === 'active' || sesi.status === 'completed') return sesi.status === 'active';

  const start = sesi.waktu_mulai ? new Date(String(sesi.waktu_mulai).replace(' ', 'T')) : null;
  const end = sesi.waktu_selesai ? new Date(String(sesi.waktu_selesai).replace(' ', 'T')) : null;
  const now = new Date();

  if (start && end) return now >= start && now <= end;
  if (end) return now <= end; // open-ended start
  if (start) return now >= start; // open-ended end
  return false; // no window + not manually active
}
