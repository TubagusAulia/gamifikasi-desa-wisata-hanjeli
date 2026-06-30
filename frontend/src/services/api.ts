import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  AuthResponse, LoginCredentials, RegisterPayload, User,
  Kelompok, Peserta, Agenda, QuizSession, Soal, DaftarSoal, Pos, Review, ReviewSubmission,
  PhotoSubmission, PhotoLeaderboardEntry, LeaderboardEntry, CurrentQuizData, ApiResponse,
} from '@/types';
import { storage } from '@/utils/storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      if (globalThis.location?.pathname !== '/login') {
        globalThis.location.href = '/login';
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
  getQuiz: (id: number): Promise<Agenda[]> =>
    api.get<ApiResponse<{ kelompok: Kelompok; quiz: Agenda[]; total: number }>>(`/api/kelompok/${id}/quiz`).then((r) => r.data.data.quiz),
  addPeserta: (id: number, data: { nama: string }): Promise<Peserta> =>
    api.post<ApiResponse<Peserta>>(`/api/kelompok/${id}/peserta`, data).then((r) => r.data.data),
  create: (data: { nama: string; peserta: { nama: string; email?: string; password?: string }[] }): Promise<Kelompok> =>
    api.post<ApiResponse<Kelompok>>('/api/kelompok', data).then((r) => r.data.data),
};

// Agenda (formerly Quiz)
export const agendaApi = {
  getAll: (): Promise<Agenda[]> =>
    api.get<ApiResponse<Agenda[]>>('/api/agenda').then((r) => r.data.data),
  getById: (id: number): Promise<Agenda> =>
    api.get<ApiResponse<Agenda>>(`/api/agenda/${id}`).then((r) => r.data.data),
  getQuizSessions: (id: number): Promise<QuizSession[]> =>
    api.get<ApiResponse<{ agenda: Agenda; quiz: QuizSession[]; total: number }>>(`/api/agenda/${id}/quiz`).then((r) => r.data.data.quiz),
  getLeaderboard: (id: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/api/agenda/${id}/leaderboard`).then((r) => r.data.data),
  create: (data: { nama: string; deskripsi?: string; no_phone_policy?: boolean; kelompok_ids: number[] }): Promise<Agenda> =>
    api.post<ApiResponse<Agenda>>('/api/agenda', data).then((r) => r.data.data),
};

// Quiz (individual session)
export const quizApi = {
  getById: (id: number): Promise<QuizSession> =>
    api.get<ApiResponse<QuizSession>>(`/api/quiz/${id}`).then((r) => r.data.data),
  getSoal: (id: number): Promise<Soal[]> =>
    api.get<ApiResponse<{ quiz: { id: number; nama: string; tipe: string; agenda_id: number }; questions: Soal[]; total: number }>>(`/api/quiz/${id}/soal`).then((r) => r.data.data.questions),
  create: (data: Partial<QuizSession>): Promise<QuizSession> =>
    api.post<ApiResponse<QuizSession>>('/api/quiz', data).then((r) => r.data.data),
  activate: (id: number): Promise<QuizSession> =>
    api.put<ApiResponse<QuizSession>>(`/api/quiz/${id}/activate`, { status: 'active' }).then((r) => r.data.data),
  submit: (id: number, data: { peserta_id: number; answers: { soal_id: number; jawaban: string }[] }): Promise<{ skor: number; jumlah_benar: number }> =>
    api.post<ApiResponse<{ skor: number; jumlah_benar: number }>>(`/api/quiz/${id}/submit`, data).then((r) => r.data.data),
  kelompokAnswer: (id: number, data: { kelompok_id: number; soal_id: number; peserta_id: number }): Promise<{ skor: number }> =>
    api.post<ApiResponse<{ skor: number }>>(`/api/quiz/${id}/kelompok-answer`, data).then((r) => r.data.data),
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

// Soal
export const soalApi = {
  getByQuiz: (quizId: number): Promise<Soal[]> =>
    api.get<ApiResponse<{ quiz: { id: number; nama: string; tipe: string; agenda_id: number }; questions: Soal[]; total: number }>>(`/api/quiz/${quizId}/soal`).then((r) => r.data.data.questions),
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

// Photo
export const photoApi = {
  upload: (formData: FormData): Promise<PhotoSubmission> =>
    api.post<ApiResponse<PhotoSubmission>>('/api/photo/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),
  getGallery: (quizId: number): Promise<PhotoSubmission[]> =>
    api.get<ApiResponse<PhotoSubmission[]>>(`/api/photo/gallery/${quizId}`).then((r) => r.data.data),
  getLeaderboard: (quizId: number): Promise<PhotoLeaderboardEntry[]> =>
    api.get<ApiResponse<PhotoLeaderboardEntry[]>>(`/api/photo/leaderboard/${quizId}`).then((r) => r.data.data),
  getById: (submissionId: number): Promise<PhotoSubmission> =>
    api.get<ApiResponse<PhotoSubmission>>(`/api/photo/submission/${submissionId}`).then((r) => r.data.data),
  validate: (submissionId: number, data: { validasi_status: 'valid' | 'rejected' | 'pending'; validasi_note?: string; poin_adjustment?: number }) =>
    api.put<ApiResponse<any>>(`/api/photo/submission/${submissionId}/validate`, data).then((r) => r.data.data),
};

// Leaderboard
export const leaderboardApi = {
  getQuiz: (quizId: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<{ quiz: { id: number; nama: string; tipe: string; agenda_id: number }; leaderboard: LeaderboardEntry[] }>>(`/api/leaderboard/quiz/${quizId}`).then((r) => {
      const entries = r.data.data.leaderboard;
      // Normalize: backend uses total_skor/total_benar, frontend expects skor
      return entries.map((e: LeaderboardEntry & { total_skor?: number; total_jawaban?: number }) => ({
        ...e,
        skor: e.skor ?? e.total_skor ?? e.total_jawaban ?? 0,
      }));
    }),
  getAgenda: (agendaId: number): Promise<LeaderboardEntry[]> =>
    api.get<ApiResponse<LeaderboardEntry[]>>(`/api/leaderboard/agenda/${agendaId}`).then((r) => r.data.data),
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
  getCurrentQuiz: () => api.get<ApiResponse<CurrentQuizData | null>>('/api/location/current-quiz').then((r) => r.data.data),
};

// Workers (admin) and quiz-worker assignments
export const workerApi = {
  list: (): Promise<{ id: number; nama: string; email: string }[]> =>
    api.get<ApiResponse<{ id: number; nama: string; email: string }[]>>('/api/workers').then((r) => r.data.data),
};

export const quizAdminApi = {
  assignWorker: (quizId: number, pesertaId: number) => api.post(`/api/quiz/${quizId}/assign-worker`, { peserta_id: pesertaId }).then((r) => r.data),
  unassignWorker: (quizId: number, pesertaId: number) => api.delete(`/api/quiz/${quizId}/assign-worker/${pesertaId}`).then((r) => r.data),
};

export default api;
