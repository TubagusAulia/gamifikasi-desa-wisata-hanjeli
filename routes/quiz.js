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

  let sql = 'SELECT id, nama, deskripsi, no_phone_policy, status, created_at FROM quiz';
  const params = [];

  if (role === 'peserta') {
    // Peserta only sees active quiz that their kelompok is assigned to
    sql = `SELECT DISTINCT q.id, q.nama, q.deskripsi, q.no_phone_policy, q.status, q.created_at
           FROM quiz q
           INNER JOIN quiz_kelompok qk ON q.id = qk.quiz_id
           WHERE q.status = ? AND qk.kelompok_id = ?`;
    params.push('active', req.user.kelompok_id);
  }

  sql += ' ORDER BY id';
  const [rows] = await pool.execute(sql, params);

  // Fetch sesi for each quiz to build pos mapping
  const quizIds = rows.map(r => r.id);
  let sesiMap = {};
  if (quizIds.length > 0) {
    const placeholders = quizIds.map(() => '?').join(',');
    const [sesiRows] = await pool.execute(
      `SELECT id, quiz_id, pos_id, nama, tipe FROM sesi WHERE quiz_id IN (${placeholders})`,
      quizIds
    );
    sesiRows.forEach(s => {
      if (!sesiMap[s.quiz_id]) sesiMap[s.quiz_id] = [];
      sesiMap[s.quiz_id].push(s);
    });
  }

  // Attach sesi to each quiz
  const data = rows.map(r => ({
    ...r,
    sesi: sesiMap[r.id] || [],
  }));

  // Attach assigned workers for each quiz
  if (data.length > 0) {
    const quizIds = data.map(d => d.id);
    const placeholders = quizIds.map(() => '?').join(',');
    const [workerRows] = await pool.execute(
      `SELECT qw.quiz_id, p.id AS peserta_id, p.nama, p.email FROM quiz_worker qw INNER JOIN peserta p ON qw.peserta_id = p.id WHERE qw.quiz_id IN (${placeholders})`,
      quizIds
    );
    const workerMap = {};
    workerRows.forEach(w => {
      if (!workerMap[w.quiz_id]) workerMap[w.quiz_id] = [];
      workerMap[w.quiz_id].push({ id: w.peserta_id, nama: w.nama, email: w.email });
    });
    data.forEach(d => { d.assigned_workers = workerMap[d.id] || []; });
  }

  res.json({ success: true, data });
}));

/**
 * POST /api/quiz - create quiz (admin only)
 * Body: { nama, deskripsi?, kelompok_ids: number[] }
 */
router.post('/', authenticate, authorize('admin'), validate(createQuizSchema), asyncHandler(async (req, res) => {
  const { nama, deskripsi, no_phone_policy, kelompok_ids } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [quizResult] = await connection.execute(
      'INSERT INTO quiz (nama, deskripsi, no_phone_policy, status) VALUES (?, ?, ?, ?)',
      [nama, deskripsi || null, no_phone_policy ? 1 : 0, 'active']
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
        no_phone_policy: no_phone_policy ? 1 : 0,
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

  const [quizRows] = await pool.execute('SELECT id, nama, deskripsi, no_phone_policy, status, created_at FROM quiz WHERE id = ?', [id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');
  const quiz = quizRows[0];

  const [kelompokRows] = await pool.execute(
    `SELECT k.id, k.nama FROM kelompok k
     INNER JOIN quiz_kelompok qk ON k.id = qk.kelompok_id
     WHERE qk.quiz_id = ? ORDER BY k.id`,
    [id]
  );

  const [sesiRows] = await pool.execute(
    `SELECT s.id, s.nama, s.tipe, s.status, s.password, s.waktu_mulai, s.waktu_selesai,
            ds.nama AS daftar_soal_nama, p.nama AS pos_nama
     FROM sesi s
     LEFT JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     LEFT JOIN pos p ON s.pos_id = p.id
     WHERE s.quiz_id = ? ORDER BY s.id`,
    [id]
  );

  // Fetch assigned workers
  const [workerRows] = await pool.execute(
    `SELECT p.id, p.nama, p.email FROM quiz_worker qw
     INNER JOIN peserta p ON qw.peserta_id = p.id
     WHERE qw.quiz_id = ? ORDER BY p.id`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...quiz,
      kelompok: kelompokRows,
      sesi: sesiRows,
      assigned_workers: workerRows,
    },
  });
}));

/**
 * POST /api/quiz/:id/assign-worker - assign a worker to a quiz (admin)
 * Body: { peserta_id }
 */
router.post('/:id/assign-worker', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { peserta_id } = req.body;
  if (!peserta_id) throw new ApiError(400, 'peserta_id required');

  await pool.execute('INSERT IGNORE INTO quiz_worker (quiz_id, peserta_id) VALUES (?, ?)', [id, peserta_id]);
  res.json({ success: true, data: { quiz_id: Number(id), peserta_id } });
}));

/**
 * DELETE /api/quiz/:id/assign-worker/:peserta_id - remove assignment (admin)
 */
router.delete('/:id/assign-worker/:peserta_id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id, peserta_id } = req.params;
  await pool.execute('DELETE FROM quiz_worker WHERE quiz_id = ? AND peserta_id = ?', [id, peserta_id]);
  res.json({ success: true });
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
 * Merges leaderboard JSON from all sesi in this quiz
 */
router.get('/:id/leaderboard', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [quizRows] = await pool.execute('SELECT id, nama FROM quiz WHERE id = ?', [id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  // Get all sesi in this quiz with their leaderboards
  const [sesiRows] = await pool.execute('SELECT id, nama, tipe, leaderboard FROM sesi WHERE quiz_id = ?', [id]);

  // Merge all leaderboard JSONs
  const scoreMap = {}; // key -> { nama, skor, kelompok_id? }

  for (const sesi of sesiRows) {
    if (!sesi.leaderboard) continue;
    const lb = JSON.parse(sesi.leaderboard);
    // Skip internal tracking field
    delete lb._answeredSoals;

    for (const [key, entry] of Object.entries(lb)) {
      if (!scoreMap[key]) {
        scoreMap[key] = { nama: entry.nama, skor: 0 };
      }
      scoreMap[key].skor += entry.skor || 0;
      // Track kelompok_id if present (kelompok entries are numeric IDs)
      if (sesi.tipe === 'kelompok') {
        scoreMap[key].kelompok_id = parseInt(key);
      }
    }
  }

  const leaderboard = Object.entries(scoreMap)
    .map(([key, entry]) => ({
      ...entry,
      peserta_id: isNaN(parseInt(key)) ? null : parseInt(key),
    }))
    .sort((a, b) => b.skor - a.skor)
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
