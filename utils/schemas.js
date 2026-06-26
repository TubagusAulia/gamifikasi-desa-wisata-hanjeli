const { z } = require('zod');

// Auth schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  nama: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['peserta', 'admin', 'worker']).default('peserta'),
  kelompok_id: z.number().int().positive().optional(),
});

// Location schemas
const updatePositionSchema = z.object({
  peserta_id: z.number().int().positive(),
  quiz_id: z.number().int().positive(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

const nearbyPosSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  quiz_id: z.coerce.number().int().positive(),
});

// Map pos schemas
const createPosSchema = z.object({
  sesi_id: z.number().int().positive(),
  nama_pos: z.string().min(1, 'Pos name is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meter: z.number().positive().default(50),
  deskripsi: z.string().optional(),
});

const updatePosSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_meter: z.number().positive().optional(),
  deskripsi: z.string().optional(),
  nama_pos: z.string().min(1).optional(),
});

// Photo schemas
const photoUploadSchema = z.object({
  peserta_id: z.coerce.number().int().positive(),
  sesi_id: z.coerce.number().int().positive(),
  lokasi_pos_id: z.coerce.number().int().positive(),
  caption: z.string().max(255).optional(),
});

const validatePhotoSchema = z.object({
  validasi_status: z.enum(['valid', 'rejected']),
  validasi_note: z.string().optional(),
  poin_adjustment: z.number().int().optional(),
});

// Quiz schemas
const quizSubmitSchema = z.object({
  answers: z.array(z.object({
    soal_id: z.number().int().positive(),
    jawaban: z.string().min(1),
  })),
});

// =====================
// New schemas (database_schema.sql v2)
// =====================

// Kelompok schemas
const createKelompokSchema = z.object({
  nama: z.string().min(1, 'Nama kelompok is required').max(255),
  peserta: z.array(z.object({
    nama: z.string().min(1, 'Nama peserta is required').max(255),
    email: z.string().email('Invalid email format').optional(),
    password: z.string().min(1).optional(),
  })).min(1, 'At least one peserta is required'),
});

// Quiz schemas (v2)
const createQuizSchema = z.object({
  nama: z.string().min(1, 'Nama quiz is required').max(255),
  deskripsi: z.string().optional(),
  kelompok_ids: z.array(z.number().int().positive()).min(1, 'At least one kelompok is required'),
});

// Sesi schemas
const createSesiSchema = z.object({
  quiz_id: z.number().int().positive(),
  daftar_soal_id: z.number().int().positive(),
  pos_id: z.number().int().positive(),
  nama: z.string().min(1, 'Nama sesi is required').max(255),
  tipe: z.enum(['individu', 'kelompok']),
  waktu_mulai: z.string().optional(),
  waktu_selesai: z.string().optional(),
  status: z.enum(['inactive', 'active']).default('inactive'),
});

const updateSesiSchema = z.object({
  nama: z.string().min(1).max(255).optional(),
  tipe: z.enum(['individu', 'kelompok']).optional(),
  waktu_mulai: z.string().optional(),
  waktu_selesai: z.string().optional(),
  status: z.enum(['inactive', 'active', 'completed']).optional(),
  daftar_soal_id: z.number().int().positive().optional(),
  pos_id: z.number().int().positive().optional(),
});

const activateSesiSchema = z.object({
  status: z.enum(['active']),
});

const submitJawabanSchema = z.object({
  peserta_id: z.number().int().positive(),
  answers: z.array(z.object({
    soal_id: z.number().int().positive(),
    jawaban: z.string().min(1),
  })).min(1, 'At least one answer is required'),
});

const kelompokAnswerSchema = z.object({
  kelompok_id: z.number().int().positive(),
  soal_id: z.number().int().positive(),
  peserta_id: z.number().int().positive(),
});

// Daftar Soal schemas
const createDaftarSoalSchema = z.object({
  nama: z.string().min(1, 'Nama daftar soal is required').max(255),
  kategori: z.enum(['TK', 'SD', 'SMP', 'SMA', 'Universitas', 'Bebas']).default('Bebas'),
  soal: z.array(z.object({
    pertanyaan: z.string().min(1, 'Pertanyaan is required'),
    opsi_a: z.string().optional(),
    opsi_b: z.string().optional(),
    opsi_c: z.string().optional(),
    opsi_d: z.string().optional(),
    jawaban_benar: z.enum(['A', 'B', 'C', 'D']),
    poin: z.number().int().positive().default(1),
  })).min(1, 'At least one soal is required'),
});

// Pos schemas (v2)
const createPosSchemaV2 = z.object({
  nama: z.string().min(1, 'Nama pos is required').max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meter: z.number().positive().default(50),
  deskripsi: z.string().optional(),
});

const updatePosSchemaV2 = z.object({
  nama: z.string().min(1).max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_meter: z.number().positive().optional(),
  deskripsi: z.string().optional(),
});

// Review schemas
const createReviewSchema = z.object({
  nama: z.string().min(1, 'Nama review is required').max(255),
  deskripsi: z.string().optional(),
  kelompok_ids: z.array(z.number().int().positive()).min(1, 'At least one kelompok is required'),
});

const uploadReviewSchema = z.object({
  kelompok_id: z.coerce.number().int().positive(),
  pos_id: z.coerce.number().int().positive(),
  caption: z.string().max(255).optional(),
});

const gradeReviewSchema = z.object({
  submission_id: z.number().int().positive(),
  nilai: z.number().int().min(0).max(100),
});

// Location schemas (v2)
const updateLocationSchema = z.object({
  peserta_id: z.number().int().positive(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

const nearbyPosSchemaV2 = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

module.exports = {
  loginSchema,
  registerSchema,
  updatePositionSchema,
  nearbyPosSchema,
  createPosSchema,
  updatePosSchema,
  photoUploadSchema,
  validatePhotoSchema,
  quizSubmitSchema,
  // v2
  createKelompokSchema,
  createQuizSchema,
  createSesiSchema,
  updateSesiSchema,
  activateSesiSchema,
  submitJawabanSchema,
  kelompokAnswerSchema,
  createDaftarSoalSchema,
  createPosSchema: createPosSchemaV2,
  updatePosSchema: updatePosSchemaV2,
  createReviewSchema,
  uploadReviewSchema,
  gradeReviewSchema,
  updateLocationSchema,
  nearbyPosSchemaV2,
};
