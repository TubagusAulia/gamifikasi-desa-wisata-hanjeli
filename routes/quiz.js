const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createQuizSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * GET /api/quiz - list all quiz
 * (admin, worker, peserta can see active ones)
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { role } = req.user;

  let sql = 'SELECT id, nama, deskripsi, status, created_at FROM quiz';
  const params = [];

  if (role === 'peserta') {
    // Peserta only sees active quiz that their kelompok is assigned to
    sql = `SELECT DISTINCT q.id, q.nama, q.deskripsi, q.status, q.created_at
           FROM quiz q
           INNER JOIN quiz_kelompok qk ON q.id = qk.quiz_id
           WHERE q.status = ? AND qk.kelompok_id = ?`;
    params.push('active', req.user.kelompok_id);
  }

  sql += ' ORDER BY id';
  const [rows] = await pool.execute(sql, params);

  res.json({ success: true, data: rows });
}));

/**
 * POST /api/quiz - create quiz (admin only)
 * Body: { nama, deskripsi?, kelompok_ids: number[] }
 */
router.post('/', authenticate, authorize('admin'), validate(createQuizSchema), asyncHandler(async (req, res) => {
  const { nama, deskripsi, kelompok_ids } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [quizResult] = await connection.execute(
      'INSERT INTO quiz (nama, deskripsi, status) VALUES (?, ?, ?)',
      [nama, deskripsi || null, 'active']
    );
    const quizId = quizResult.insertId;

    for (const kelompokId of kelompok_ids) {
      await connection.execute(
        'INSERT INTO quiz_kelompok (quiz_id, kelompok_id) VALUES (?, ?)',
        [quizId, kelompokId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: quizId,
        nama,
        deskripsi: deskripsi || null,
        kelompok_ids,
        assigned_kelompok: kelompok_ids.length,
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
 * GET /api/quiz/:id - quiz detail with assigned kelompok and sesi list
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [quizRows] = await pool.execute('SELECT id, nama, deskripsi, status, created_at FROM quiz WHERE id = ?', [id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');
  const quiz = quizRows[0];

  const [kelompokRows] = await pool.execute(
    `SELECT k.id, k.nama FROM kelompok k
     INNER JOIN quiz_kelompok qk ON k.id = qk.kelompok_id
     WHERE qk.quiz_id = ? ORDER BY k.id`,
    [id]
  );

  const [sesiRows] = await pool.execute(
    `SELECT s.id, s.nama, s.tipe, s.status, s.waktu_mulai, s.waktu_selesai,
            ds.nama AS daftar_soal_nama, p.nama AS pos_nama
     FROM sesi s
     LEFT JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     LEFT JOIN pos p ON s.pos_id = p.id
     WHERE s.quiz_id = ? ORDER BY s.id`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...quiz,
      kelompok: kelompokRows,
      sesi: sesiRows,
    },
  });
}));

/**
 * GET /api/quiz/:id/sesi - list sesi in a quiz
 */
router.get('/:id/sesi', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [quizRows] = await pool.execute('SELECT id, nama FROM quiz WHERE id = ?', [id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  const [sesiRows] = await pool.execute(
    `SELECT s.id, s.nama, s.tipe, s.status, s.waktu_mulai, s.waktu_selesai,
            s.daftar_soal_id, ds.nama AS daftar_soal_nama,
            s.pos_id, p.nama AS pos_nama
     FROM sesi s
     LEFT JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     LEFT JOIN pos p ON s.pos_id = p.id
     WHERE s.quiz_id = ? ORDER BY s.id`,
    [id]
  );

  res.json({
    success: true,
    data: {
      quiz: quizRows[0],
      sesi: sesiRows,
      total: sesiRows.length,
    },
  });
}));

/**
 * GET /api/quiz/:id/leaderboard - leaderboard for quiz
 * Calculates from jawaban (individual) + kelompok_answer tables
 */
router.get('/:id/leaderboard', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [quizRows] = await pool.execute('SELECT id, nama FROM quiz WHERE id = ?', [id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  // Get all sesi in this quiz
  const [sesiRows] = await pool.execute('SELECT id, tipe, nama FROM sesi WHERE quiz_id = ?', [id]);
  const sesiIds = sesiRows.map(s => s.id);
  const sesiMap = {};
  sesiRows.forEach(s => { sesiMap[s.id] = s; });

  const scoreMap = {}; // peserta_id -> { total_skor, kelompok_id, kelompok_nama }

  if (sesiIds.length > 0) {
    const placeholders = sesiIds.map(() => '?').join(',');

    // Individual scores from jawaban
    const [jawabanRows] = await pool.execute(
      `SELECT j.peserta_id, SUM(j.skor) AS total_skor
       FROM jawaban j
       WHERE j.sesi_id IN (${placeholders}) AND j.benar = 1
       GROUP BY j.peserta_id`,
      sesiIds
    );

    // Kelompok scores from kelompok_answer
    const [kelompokAnswerRows] = await pool.execute(
      `SELECT ka.kelompok_id, ka.peserta_id, COUNT(*) AS jawaban_count
       FROM kelompok_answer ka
       WHERE ka.sesi_id IN (${placeholders})
       GROUP BY ka.kelompok_id, ka.peserta_id`,
      sesiIds
    );

    jawabanRows.forEach(j => {
      if (!scoreMap[j.peserta_id]) scoreMap[j.peserta_id] = { total_skor: 0, kelompok_id: null, kelompok_nama: null };
      scoreMap[j.peserta_id].total_skor += j.total_skor || 0;
    });

    // For kelompok answers, we count per kelompok (display at kelompok level)
    const kelompokScoreMap = {};
    kelompokAnswerRows.forEach(ka => {
      if (!kelompokScoreMap[ka.kelompok_id]) kelompokScoreMap[ka.kelompok_id] = 0;
      kelompokScoreMap[ka.kelompok_id] += ka.jawaban_count || 0;
    });

    // Attach kelompok info to individual scores
    const allPesertaIds = Object.keys(scoreMap);
    if (allPesertaIds.length > 0) {
      const pPlaceholders = allPesertaIds.map(() => '?').join(',');
      const [pesertaInfo] = await pool.execute(
        `SELECT p.id, p.nama, p.kelompok_id, k.nama AS kelompok_nama
         FROM peserta p
         LEFT JOIN kelompok k ON p.kelompok_id = k.id
         WHERE p.id IN (${pPlaceholders})`,
        allPesertaIds
      );
      pesertaInfo.forEach(p => {
        if (scoreMap[p.id]) {
          scoreMap[p.id].nama = p.nama;
          scoreMap[p.id].kelompok_id = p.kelompok_id;
          scoreMap[p.id].kelompok_nama = p.kelompok_nama;
        }
      });
    }

    // Build kelompok leaderboard entries
    const kelompokIds = Object.keys(kelompokScoreMap);
    if (kelompokIds.length > 0) {
      const kPlaceholders = kelompokIds.map(() => '?').join(',');
      const [kelompokInfo] = await pool.execute(
        `SELECT id, nama FROM kelompok WHERE id IN (${kPlaceholders})`,
        kelompokIds
      );
      const kelompokNameMap = {};
      kelompokInfo.forEach(k => { kelompokNameMap[k.id] = k.nama; });

      kelompokIds.forEach(kid => {
        const key = `kelompok_${kid}`;
        scoreMap[key] = {
          peserta_id: null,
          nama: kelompokNameMap[kid] || `Kelompok ${kid}`,
          kelompok_id: parseInt(kid),
          kelompok_nama: kelompokNameMap[kid] || `Kelompok ${kid}`,
          total_skor: kelompokScoreMap[kid],
          is_kelompok: true,
        };
      });
    }
  }

  const leaderboard = Object.values(scoreMap)
    .sort((a, b) => b.total_skor - a.total_skor)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  res.json({
    success: true,
    data: {
      quiz: quizRows[0],
      leaderboard,
    },
  });
}));

module.exports = router;
