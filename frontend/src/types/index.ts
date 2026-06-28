export type UserRole = 'peserta' | 'admin' | 'worker';

export interface User {
  id: number;
  nama: string;
  email: string;
  role: UserRole;
  userclass?: UserRole;
  kelompok_id?: number;
  kelompok_nama?: string;
}

export interface Kelompok {
  id: number;
  nama: string;
  created_at: string;
  peserta?: Peserta[];
  peserta_count?: number;
}

export interface Peserta {
  id: number;
  nama: string;
  email: string;
  kelompok_id: number;
  userclass?: UserRole;
  password?: string;
}

export interface Pos {
  id: number;
  nama: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  deskripsi?: string;
}

export interface Agenda {
  id: number;
  nama: string;
  deskripsi?: string;
  no_phone_policy?: number;
  status: 'active' | 'inactive';
  created_at: string;
  kelompok?: Kelompok[];
  sesi?: QuizSession[];
  assigned_workers?: { id: number; nama: string; email: string }[];
}

export interface QuizSession {
  id: number;
  quiz_id: number;
  daftar_soal_id: number;
  pos_id: number;
  nama: string;
  tipe: 'individu' | 'kelompok';
  waktu_mulai: string;
  waktu_selesai: string;
  status: 'inactive' | 'active' | 'completed';
  password?: string;
  leaderboard?: Record<string, { nama: string; skor: number }>;
  pos?: Pos;
  pos_nama?: string;
  daftar_soal_nama?: string;
  soal_count?: number;
  has_submitted?: boolean;
}


export interface Soal {
  id: number;
  daftar_soal_id: number;
  pertanyaan: string;
  opsi_a?: string;
  opsi_b?: string;
  opsi_c?: string;
  opsi_d?: string;
  jawaban_benar: 'A' | 'B' | 'C' | 'D';
  penjelasan_jawaban_benar?: string;
  poin: number;
}

export interface DaftarSoal {
  id: number;
  nama: string;
  kategori: 'TK' | 'SD' | 'SMP' | 'SMA' | 'Universitas' | 'Bebas';
  soal?: Soal[];
}

export interface Review {
  id: number;
  nama: string;
  deskripsi?: string;
  status: 'active' | 'inactive';
  kelompok?: Kelompok[];
  submissions?: ReviewSubmission[];
}

export interface ReviewSubmission {
  id: number;
  review_id: number;
  kelompok_id: number;
  pos_id: number;
  foto_url?: string;
  caption?: string;
  nilai: number;
  status: 'pending' | 'graded';
  kelompok_nama?: string;
  pos_nama?: string;
}

export interface PhotoSubmission {
  id: number;
  peserta_id: number;
  sesi_id: number;
  lokasi_pos_id: number;
  foto_url: string;
  caption?: string;
  validasi_status: 'pending' | 'valid' | 'rejected';
  poin_diberikan: number;
  created_at: string;
  updated_at: string;
  nama: string;
  nama_pos: string;
}

export interface PhotoLeaderboardEntry {
  rank: number;
  peserta_id: number;
  nama: string;
  total_poin: number;
  submission_count: number;
  valid_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  peserta_id?: number;
  kelompok_id?: number;
  nama: string;
  kelompok_nama?: string;
  skor: number;
  total?: number;
}

export interface CurrentQuizData {
  sesi_id: number;
  sesi_nama: string;
  tipe: 'individu' | 'kelompok';
  status: 'inactive' | 'active' | 'completed';
  password?: string;
  waktu_mulai: string;
  waktu_selesai: string;
  is_time_valid: boolean;
  has_submitted: boolean;
  quiz_id: number;
  quiz_nama: string;
  daftar_soal_id: number;
  daftar_soal_nama: string;
  pos_id: number;
  pos_nama: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
}

// API wrapper types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nama: string;
  email: string;
  password: string;
  role: UserRole;
  kelompok_id?: number;
}
