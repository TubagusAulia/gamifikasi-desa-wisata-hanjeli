import { create } from 'zustand';
import axios from 'axios';
import type { User, LoginCredentials, RegisterPayload } from '@/types';
import { storage } from '@/utils/storage';
import { authApi } from '@/services/api';
import { socketService } from '@/services/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (creds: LoginCredentials) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  loadSession: () => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  async login(creds) {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(creds);
      storage.set('token', res.token);
      storage.set('user', res.user);
      socketService.connect(res.token);
      set({ user: res.user, token: res.token, isLoading: false });
      return res.user;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : (err instanceof Error ? err.message : 'Login gagal');
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  async register(payload) {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(payload);
      storage.set('token', res.token);
      storage.set('user', res.user);
      socketService.connect(res.token);
      set({ user: res.user, token: res.token, isLoading: false });
      return res.user;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : (err instanceof Error ? err.message : 'Registrasi gagal');
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  loadSession() {
    const token = storage.get<string>('token');
    const user = storage.get<User>('user');
    if (token && user) {
      set({ token, user });
      socketService.connect(token);
    }
    set({ isInitialized: true });
  },

  logout() {
    socketService.disconnect();
    storage.remove('token');
    storage.remove('user');
    set({ user: null, token: null });
  },

  clearError() {
    set({ error: null });
  },
}));
