const PREFIX = 'gamifikasi_';

export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage full or unavailable
    }
  },
  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },
  clear(): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  },
};
