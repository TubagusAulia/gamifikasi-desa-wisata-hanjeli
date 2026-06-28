import { Trophy, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '@/types';

interface Props {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  title?: string;
}

export function LeaderboardTable({ entries, isLoading, title = 'Leaderboard' }: Props) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-surface-alt rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-accent" />
          <h3 className="font-bold text-text">{title}</h3>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={(entry.peserta_id || entry.kelompok_id || 0) + '-' + entry.rank}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              entry.rank <= 3 ? 'bg-accent-50' : 'hover:bg-surface-hover'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                entry.rank === 1
                  ? 'bg-warning-50 text-warning-dark'
                  : entry.rank === 2
                  ? 'bg-gray-100 text-text-secondary'
                  : entry.rank === 3
                  ? 'bg-accent-50 text-accent-dark'
                  : 'bg-surface-alt text-text-muted'
              }`}
            >
              {entry.rank <= 3 ? <Medal size={16} /> : entry.rank}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-text truncate">{entry.nama}</p>
              {entry.kelompok_nama && (
                <p className="text-xs text-text-muted">{entry.kelompok_nama}</p>
              )}
            </div>

            <div className="text-right">
              <p className="font-bold text-accent">{entry.total ?? entry.skor}</p>
              <p className="text-xs text-text-muted">poin</p>
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && !isLoading && (
        <p className="text-center text-text-muted py-6">Belum ada data leaderboard</p>
      )}
    </div>
  );
}
