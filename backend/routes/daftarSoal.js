const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDaftarSoalSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * GET /api/daftar-soal - list all daftar soal (admin, worker)
 */
router.get('/', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, nama, kategori, created_at FROM daftar_soal ORDER BY id'
  );

  // Attach question count
  const data = [];
  for (const row of rows) {
    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM soal WHERE daftar_soal_id = ?',
      [row.id]
    );
    data.push({ ...row, question_count: countRow.count });
  }

  res.json({ success: true, data });
}));

/**
 * POST /api/daftar-soal - create daftar soal with bulk questions (admin only)
 * Body: { nama, kategori, soal: [{ pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, poin }] }
 */
router.post('/', authenticate, authorize('admin'), validate(createDaftarSoalSchema), asyncHandler(async (req, res) => {
  const { nama, kategori, soal } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [daftarResult] = await connection.execute(
      'INSERT INTO daftar_soal (nama, kategori) VALUES (?, ?)',
      [nama, kategori || 'Bebas']
    );
    const daftarSoalId = daftarResult.insertId;

    const createdSoal = [];
    for (const s of soal) {
      const [soalResult] = await connection.execute(
        'INSERT INTO soal (daftar_soal_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, poin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          daftarSoalId,
          s.pertanyaan,
          s.opsi_a || null,
          s.opsi_b || null,
          s.opsi_c || null,
          s.opsi_d || null,
          s.jawaban_benar,
          s.poin || 1,
        ]
      );
      createdSoal.push({
        id: soalResult.insertId,
        pertanyaan: s.pertanyaan,
        jawaban_benar: s.jawaban_benar,
        poin: s.poin || 1,
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: daftarSoalId,
        nama,
        kategori: kategori || 'Bebas',
        total_soal: createdSoal.length,
        soal: createdSoal,
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
 * GET /api/daftar-soal/:id - daftar soal detail with questions
 */
router.get('/:id', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [daftarRows] = await pool.execute('SELECT id, nama, kategori, created_at FROM daftar_soal WHERE id = ?', [id]);
  if (daftarRows.length === 0) throw new ApiError(404, 'Daftar soal not found');

  const daftar = daftarRows[0];

  const [soalRows] = await pool.execute(
    'SELECT id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, poin FROM soal WHERE daftar_soal_id = ? ORDER BY id',
    [id]
  );

  res.json({
    success: true,
    data: {
      ...daftar,
      soal: soalRows,
      total_soal: soalRows.length,
    },
  });
}));

module.exports = router;
