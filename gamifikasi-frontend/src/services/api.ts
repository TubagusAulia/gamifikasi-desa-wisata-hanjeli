import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  AuthResponse, LoginCredentials, RegisterPayload, User,
  Kelompok, Peserta, Quiz, Sesi, Soal, DaftarSoal, Pos, Review, ReviewSubmission,
  LeaderboardEntry, ApiResponse,
} from '@/types';
import { storage } from '@/utils/storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.get<string>('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      storage.remove('token');
      storage.remove('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (creds: LoginCredentials): Promise<AuthResponse> =>
    api.post<ApiResponse<AuthResponse>>('/api/auth/login', creds).then((r) => r.data.data),
  register: (payload: RegisterPayload): Promise<AuthResponse> =>
    api.post<ApiResponse<AuthResponse>>('/api/auth/register', payload).then((r) => r.data.data),
  me: (): Promise<User> =>
    api.get<ApiResponse<User>>('/api/auth/me').then((r) => r.data.data),
};

// Kelompok
export const kelompokApi = {
  getAll: (): Promise<Kelompok[]> =>
    api.get<ApiResponse<Kelompok[]>>('/api/kelompok').then((r) => r.data.data),
  getById: (id: number): Promise<Kelompok & { peserta?: Peserta[] }> =>
    api.get<ApiResponse<Kelompok & { peserta?: Peserta[] }>>(`/api/kelompok/${id}`).then((r) => r.data.data),
  getPeserta: (id: number): Promise<Peserta[]> =>
    api.get<ApiResponse<{ kelompok: Kelompok; peserta: Peserta[]; total: number }>>(`/api/kelompok/${id}/peserta`).then((r) => r.data.data.peserta),
  getQuiz: (id: number): Promise<Quiz[]> =>
    api.get<ApiResponse<{ kelompok: Kelompok; quiz: Quiz[]; total: number }>>(`/api/kelompok/${id}/quiz`).then((r) => r.data.data.quiz),
  create: (data: { nama: string; peserta: { nama: string; email?: string; password?: string }[] }): Promise<Kelompok> =>
    api.post<ApiResponse<Kelompok>>('/api/kelompok', data).then((r) => r.data.data),
};

// Quiz
export const quizApi = {
  getAll: (): Promise<Quiz[]> =>
    api.get<ApiResponse<Quiz[]>>('/api/quiz').then((r) => r.data.data),
  getById: (id: number): Promise<Quiz> =>
    api.get<ApiResponse<Quiz>>(`/api/quiz/${id}`).then((r) => r.data.data),
  getSesi: (id: number): Promise<Sesi[]> =>
    api.get<ApiResponse<{ quiz: Quiz; sesi: Sesi[]; total: number }>>(`/api/quiz/${id}/sesi`).then((r) => r.data.data.sesi),
  getLeaderboard: (id: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/api/quiz/${id}/leaderboard`).then((r) => r.data.data),
  create: (data: { nama: string; deskripsi?: string; kelompok_ids: number[] }): Promise<Quiz> =>
    api.post<ApiResponse<Quiz>>('/api/quiz', data).then((r) => r.data.data),
};

// Sesi
export const sesiApi = {
  getById: (id: number): Promise<Sesi> =>
    api.get<ApiResponse<Sesi>>(`/api/sesi/${id}`).then((r) => r.data.data),
  getSesi: (id: number): Promise<Sesi> =>
    api.get<ApiResponse<Sesi>>(`/api/sesi/${id}`).then((r) => r.data.data),
  getSoal: (id: number): Promise<Soal[]> =>
    api.get<ApiResponse<Soal[]>>(`/api/sesi/${id}/soal`).then((r) => r.data.data),
  create: (data: Partial<Sesi>): Promise<Sesi> =>
    api.post<ApiResponse<Sesi>>('/api/sesi', data).then((r) => r.data.data),
  activate: (id: number): Promise<Sesi> =>
    api.put<ApiResponse<Sesi>>(`/api/sesi/${id}/activate`, { status: 'active' }).then((r) => r.data.data),
  submit: (id: number, data: { peserta_id: number; answers: { soal_id: number; jawaban: string }[] }): Promise<{ skor: number; jumlah_benar: number }> =>
    api.post<ApiResponse<{ skor: number; jumlah_benar: number }>>(`/api/sesi/${id}/submit`, data).then((r) => r.data.data),
  kelompokAnswer: (id: number, data: { kelompok_id: number; soal_id: number; peserta_id: number }): Promise<void> =>
    api.post(`/api/sesi/${id}/kelompok-answer`, data).then((r) => r.data),
};

// Daftar Soal
export const daftarSoalApi = {
  getAll: (): Promise<DaftarSoal[]> =>
    api.get<ApiResponse<DaftarSoal[]>>('/api/daftar-soal').then((r) => r.data.data),
  getById: (id: number): Promise<DaftarSoal> =>
    api.get<ApiResponse<DaftarSoal>>(`/api/daftar-soal/${id}`).then((r) => r.data.data),
  create: (data: { nama: string; kategori: string; soal: Partial<Soal>[] }): Promise<DaftarSoal> =>
    api.post<ApiResponse<DaftarSoal>>('/api/daftar-soal', data).then((r) => r.data.data),
};

// Pos
export const posApi = {
  getAll: (): Promise<Pos[]> =>
    api.get<ApiResponse<Pos[]>>('/api/pos').then((r) => r.data.data),
  getById: (id: number): Promise<Pos> =>
    api.get<ApiResponse<Pos>>(`/api/pos/${id}`).then((r) => r.data.data),
  create: (data: Partial<Pos>): Promise<Pos> =>
    api.post<ApiResponse<Pos>>('/api/pos', data).then((r) => r.data.data),
  update: (id: number, data: Partial<Pos>): Promise<Pos> =>
    api.put<ApiResponse<Pos>>(`/api/pos/${id}`, data).then((r) => r.data.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/api/pos/${id}`).then((r) => r.data),
};

// Review
export const reviewApi = {
  getAll: (): Promise<Review[]> =>
    api.get<ApiResponse<Review[]>>('/api/review').then((r) => r.data.data),
  getById: (id: number): Promise<Review> =>
    api.get<ApiResponse<Review>>(`/api/review/${id}`).then((r) => r.data.data),
  getSubmissions: (id: number): Promise<ReviewSubmission[]> =>
    api.get<ApiResponse<{ review: Review; submissions: ReviewSubmission[]; total: number }>>(`/api/review/${id}/submissions`).then((r) => r.data.data.submissions),
  getLeaderboard: (id: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<{ review: Review; leaderboard: LeaderboardEntry[] }>>(`/api/review/${id}/leaderboard`).then((r) => r.data.data.leaderboard),
  create: (data: { nama: string; deskripsi?: string; kelompok_ids: number[] }): Promise<Review> =>
    api.post<ApiResponse<Review>>('/api/review', data).then((r) => r.data.data),
  upload: (reviewId: number, formData: FormData): Promise<ReviewSubmission> =>
    api.post<ApiResponse<ReviewSubmission>>(`/api/review/${reviewId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),
  grade: (reviewId: number, data: { submission_id: number; nilai: number }): Promise<void> =>
    api.put(`/api/review/${reviewId}/grade`, data).then((r) => r.data),
};

// Leaderboard
export const leaderboardApi = {
  getSesi: (sesiId: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/api/leaderboard/sesi/${sesiId}`).then((r) => r.data.data),
  getQuiz: (quizId: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/api/leaderboard/quiz/${quizId}`).then((r) => r.data.data),
  getReview: (reviewId: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/api/leaderboard/review/${reviewId}`).then((r) => r.data.data),
};

// Location
export const locationApi = {
  update: (data: { peserta_id: number; lat: number; lon: number; accuracy?: number }): Promise<unknown> =>
    api.post('/api/location/update', data).then((r) => r.data),
  getNearby: (lat: number, lon: number): Promise<(Pos & { distance_meters: number })[]> =>
    api.get<ApiResponse<(Pos & { distance_meters: number })[]>>(`/api/location/nearby-pos?lat=${lat}&lon=${lon}`).then((r) => r.data.data),
  getPeserta: (pesertaId: number): Promise<{ latitude: number; longitude: number; last_updated: string }> =>
    api.get(`/api/location/peserta/${pesertaId}`).then((r) => r.data),
};

export default api;
