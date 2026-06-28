import { create } from 'zustand';
import type { LeaderboardEntry } from '@/types';

interface LeaderboardState {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  lastUpdated: string | null;
  setEntries: (entries: LeaderboardEntry[]) => void;
  addEntries: (newEntries: LeaderboardEntry[]) => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  entries: [],
  isLoading: false,
  lastUpdated: null,

  setEntries(entries) {
    set({
      entries,
      lastUpdated: new Date().toISOString(),
    });
  },

  addEntries(newEntries) {
    set({
      entries: newEntries,
      lastUpdated: new Date().toISOString(),
    });
  },
}));
