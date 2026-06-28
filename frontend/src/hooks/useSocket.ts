import { useEffect } from 'react';
import { socketService } from '@/services/socket';
import type { LeaderboardEntry } from '@/types';

export function useSocket(token: string | null) {
  useEffect(() => {
    if (!token) return;

    socketService.connect(token);

    const onLeaderboard = (_data: LeaderboardEntry[]) => {
      // handled by pages that need it
    };

    socketService.on('leaderboard_updated', onLeaderboard);

    return () => {
      socketService.off('leaderboard_updated', onLeaderboard);
      socketService.disconnect();
    };
  }, [token]);
}
