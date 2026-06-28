import { useAuthStore } from '@/stores/authStore';
import { TrendingUp, Target, Award } from 'lucide-react';

interface Props {
  totalPos?: number;
  completedPos?: number;
  totalScore?: number;
  rank?: number;
}

export function ProgressTracker({ totalPos = 3, completedPos = 0, totalScore = 0, rank }: Props) {
  const { user } = useAuthStore();
  const progress = totalPos > 0 ? Math.round((completedPos / totalPos) * 100) : 0;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-accent" />
        <h3 className="font-bold text-text">Progress</h3>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-muted">Skor Total</span>
        <span className="text-2xl font-bold text-accent">{totalScore}</span>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-text-muted mb-1">
          <span>Sesi Diselesaikan</span>
          <span>{completedPos}/{totalPos}</span>
        </div>
        <div className="w-full h-3 bg-surface-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-secondary to-secondary-light rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-secondary-50 rounded-lg p-3 text-center">
          <Target size={16} className="mx-auto text-secondary mb-1" />
          <p className="text-lg font-bold text-secondary">{rank ?? '-'}</p>
          <p className="text-xs text-text-muted">Ranking</p>
        </div>
        <div className="bg-accent-50 rounded-lg p-3 text-center">
          <Award size={16} className="mx-auto text-accent mb-1" />
          <p className="text-lg font-bold text-accent">{completedPos}</p>
          <p className="text-xs text-text-muted">Sesi</p>
        </div>
      </div>
    </div>
  );
}
