const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createKelompokSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * GET /api/kelompok - list all kelompok (admin, worker)
 */
router.get('/', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(`
    SELECT k.id, k.nama, k.created_at, COUNT(p.id) AS peserta_count
    FROM kelompok k
    LEFT JOIN peserta p ON p.kelompok_id = k.id
    GROUP BY k.id, k.nama, k.created_at
    ORDER BY k.id
  `);
  res.json({ success: true, data: rows });
}));

/**
 * POST /api/kelompok - create kelompok with bulk peserta (admin only)
 * Body: { nama: string, peserta: [{ nama: string, email?: string, password?: string }] }
 */
router.post('/', authenticate, authorize('admin'), validate(createKelompokSchema), asyncHandler(async (req, res) => {
  const { nama, peserta } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Create kelompok
    const [kelompokResult] = await connection.execute(
      'INSERT INTO kelompok (nama) VALUES (?)',
      [nama]
    );
    const kelompokId = kelompokResult.insertId;

    const createdPeserta = [];

    for (const p of peserta) {
      // Generate email if not provided
      const email = p.email || `${p.nama.toLowerCase().replace(/\s+/g, '.')}@peserta.com`;
      // Default password
      const password = p.password || 'password123';
      const password_hash = await bcrypt.hash(password, 10);

      // Check for duplicate email
      const [existing] = await connection.execute('SELECT id FROM peserta WHERE email = ? LIMIT 1', [email]);
      if (existing.length > 0) {
        throw new ApiError(409, `Email already registered: ${email}`);
      }

      const [pesertaResult] = await connection.execute(
        'INSERT INTO peserta (nama, email, password_hash, role, kelompok_id) VALUES (?, ?, ?, ?, ?)',
        [p.nama, email, password_hash, 'peserta', kelompokId]
      );

      createdPeserta.push({
        id: pesertaResult.insertId,
        nama: p.nama,
        email,
        role: 'peserta',
        kelompok_id: kelompokId,
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: kelompokId,
        nama,
        created_peserta: createdPeserta.length,
        peserta: createdPeserta,
      },
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}));

/**
 * GET /api/kelompok/:id - get kelompok detail with peserta list (admin, worker)
 */
router.get('/:id', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [kelompokRows] = await pool.execute('SELECT id, nama, created_at FROM kelompok WHERE id = ?', [id]);
  if (kelompokRows.length === 0) throw new ApiError(404, 'Kelompok not found');

  const kelompok = kelompokRows[0];

  const [pesertaRows] = await pool.execute(
    'SELECT id, nama, email, role, kelompok_id, created_at FROM peserta WHERE kelompok_id = ? ORDER BY id',
    [id]
  );

  res.json({
    success: true,
    data: {
      ...kelompok,
      peserta: pesertaRows,
    },
  });
}));

/**
 * GET /api/kelompok/:id/peserta - list peserta in kelompok (admin, worker)
 */
router.get('/:id/peserta', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [kelompokRows] = await pool.execute('SELECT id, nama FROM kelompok WHERE id = ?', [id]);
  if (kelompokRows.length === 0) throw new ApiError(404, 'Kelompok not found');

  const [pesertaRows] = await pool.execute(
    'SELECT id, nama, email, role, kelompok_id, created_at FROM peserta WHERE kelompok_id = ? ORDER BY id',
    [id]
  );

  res.json({
    success: true,
    data: {
      kelompok: kelompokRows[0],
      peserta: pesertaRows,
      total: pesertaRows.length,
    },
  });
}));

/**
 * GET /api/kelompok/:id/quiz - list quiz assigned to kelompok (admin, worker)
 */
router.get('/:id/quiz', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [kelompokRows] = await pool.execute('SELECT id, nama FROM kelompok WHERE id = ?', [id]);
  if (kelompokRows.length === 0) throw new ApiError(404, 'Kelompok not found');

  const [quizRows] = await pool.execute(
    `SELECT q.id, q.nama, q.deskripsi, q.status, q.created_at
     FROM quiz q
     INNER JOIN quiz_kelompok qk ON q.id = qk.quiz_id
     WHERE qk.kelompok_id = ?
     ORDER BY q.id`,
    [id]
  );

  res.json({
    success: true,
    data: {
      kelompok: kelompokRows[0],
      quiz: quizRows,
      total: quizRows.length,
    },
  });
}));

module.exports = router;
