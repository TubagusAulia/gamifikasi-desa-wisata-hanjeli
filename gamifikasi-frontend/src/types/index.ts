export type UserRole = 'peserta' | 'admin' | 'worker';

export interface User {
  id: number;
  nama: string;
  email: string;
  role: UserRole;
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
}

export interface Pos {
  id: number;
  nama: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  deskripsi?: string;
}

export interface Quiz {
  id: number;
  nama: string;
  deskripsi?: string;
  status: 'active' | 'inactive';
  created_at: string;
  kelompok?: Kelompok[];
  sesi?: Sesi[];
}

export interface Sesi {
  id: number;
  quiz_id: number;
  daftar_soal_id: number;
  pos_id: number;
  nama: string;
  tipe: 'individu' | 'kelompok';
  waktu_mulai: string;
  waktu_selesai: string;
  status: 'inactive' | 'active' | 'completed';
  pos?: Pos;
  soal_count?: number;
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

export interface LeaderboardEntry {
  rank: number;
  peserta_id?: number;
  kelompok_id?: number;
  nama: string;
  kelompok_nama?: string;
  skor: number;
  total?: number;
}

export interface Jawaban {
  id: number;
  peserta_id: number;
  sesi_id: number;
  soal_id: number;
  jawaban: string;
  benar: boolean;
  skor: number;
}

export interface KelompokAnswer {
  id: number;
  sesi_id: number;
  kelompok_id: number;
  soal_id: number;
  peserta_id: number;
  peserta_nama?: string;
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
