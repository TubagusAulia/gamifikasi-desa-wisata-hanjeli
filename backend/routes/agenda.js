const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAgendaSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * GET /api/agenda - list all agenda
 * (admin, worker, peserta can see active ones)
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { role } = req.user;

  let sql = 'SELECT id, nama, deskripsi, no_phone_policy, status, created_at FROM agenda';
  const params = [];

  if (role === 'peserta') {
    // Peserta only sees active agenda that their kelompok is assigned to
    sql = `SELECT DISTINCT q.id, q.nama, q.deskripsi, q.no_phone_policy, q.status, q.created_at
           FROM agenda q
           INNER JOIN agenda_kelompok qk ON q.id = qk.agenda_id
           WHERE q.status = ? AND qk.kelompok_id = ?`;
    params.push('active', req.user.kelompok_id);
  }

  sql += ' ORDER BY id';
  const [rows] = await pool.execute(sql, params);

  // Fetch quiz for each agenda to build pos mapping
  const agendaIds = rows.map(r => r.id);
  let quizMap = {};
  if (agendaIds.length > 0) {
    const placeholders = agendaIds.map(() => '?').join(',');
    const [quizRows] = await pool.execute(
      `SELECT id, agenda_id, pos_id, nama, tipe, status, waktu_mulai, waktu_selesai FROM quiz WHERE agenda_id IN (${placeholders})`,
      agendaIds
    );
    quizRows.forEach(s => {
      if (!quizMap[s.agenda_id]) quizMap[s.agenda_id] = [];
      quizMap[s.agenda_id].push(s);
    });
  }

  // Attach quiz to each agenda
  const data = rows.map(r => ({
    ...r,
    quiz: quizMap[r.id] || [],
  }));

  // Attach assigned workers for each agenda
  if (data.length > 0) {
    const agendaIds = data.map(d => d.id);
    const placeholders = agendaIds.map(() => '?').join(',');
    const [workerRows] = await pool.execute(
      `SELECT qw.agenda_id, p.id AS peserta_id, p.nama, p.email FROM agenda_worker qw INNER JOIN peserta p ON qw.peserta_id = p.id WHERE qw.agenda_id IN (${placeholders})`,
      agendaIds
    );
    const workerMap = {};
    workerRows.forEach(w => {
      if (!workerMap[w.agenda_id]) workerMap[w.agenda_id] = [];
      workerMap[w.agenda_id].push({ id: w.peserta_id, nama: w.nama, email: w.email });
    });
    data.forEach(d => { d.assigned_workers = workerMap[d.id] || []; });
  }

  res.json({ success: true, data });
}));

/**
 * POST /api/agenda - create agenda (admin only)
 * Body: { nama, deskripsi?, kelompok_ids: number[] }
 */
router.post('/', authenticate, authorize('admin'), validate(createAgendaSchema), asyncHandler(async (req, res) => {
  const { nama, deskripsi, no_phone_policy, kelompok_ids } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [agendaResult] = await connection.execute(
      'INSERT INTO agenda (nama, deskripsi, no_phone_policy, status) VALUES (?, ?, ?, ?)',
      [nama, deskripsi || null, no_phone_policy ? 1 : 0, 'active']
    );
    const agendaId = agendaResult.insertId;

    for (const kelompokId of kelompok_ids) {
      await connection.execute(
        'INSERT INTO agenda_kelompok (agenda_id, kelompok_id) VALUES (?, ?)',
        [agendaId, kelompokId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: agendaId,
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
 * GET /api/agenda/:id - agenda detail with assigned kelompok and quiz list
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [agendaRows] = await pool.execute('SELECT id, nama, deskripsi, no_phone_policy, status, created_at FROM agenda WHERE id = ?', [id]);
  if (agendaRows.length === 0) throw new ApiError(404, 'Agenda not found');
  const agenda = agendaRows[0];

  const [kelompokRows] = await pool.execute(
    `SELECT k.id, k.nama FROM kelompok k
     INNER JOIN agenda_kelompok qk ON k.id = qk.kelompok_id
     WHERE qk.agenda_id = ? ORDER BY k.id`,
    [id]
  );

  const [quizRows] = await pool.execute(
    `SELECT s.id, s.nama, s.tipe, s.status, s.password, s.waktu_mulai, s.waktu_selesai,
            ds.nama AS daftar_soal_nama, p.nama AS pos_nama
     FROM quiz s
     LEFT JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     LEFT JOIN pos p ON s.pos_id = p.id
     WHERE s.agenda_id = ? ORDER BY s.id`,
    [id]
  );

  // Fetch assigned workers
  const [workerRows] = await pool.execute(
    `SELECT p.id, p.nama, p.email FROM agenda_worker qw
     INNER JOIN peserta p ON qw.peserta_id = p.id
     WHERE qw.agenda_id = ? ORDER BY p.id`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...agenda,
      kelompok: kelompokRows,
      quiz: quizRows,
      assigned_workers: workerRows,
    },
  });
}));

/**
 * POST /api/agenda/:id/assign-worker - assign a worker to an agenda (admin)
 * Body: { peserta_id }
 */
router.post('/:id/assign-worker', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { peserta_id } = req.body;
  if (!peserta_id) throw new ApiError(400, 'peserta_id required');

  await pool.execute('INSERT IGNORE INTO agenda_worker (agenda_id, peserta_id) VALUES (?, ?)', [id, peserta_id]);
  res.json({ success: true, data: { agenda_id: Number(id), peserta_id } });
}));

/**
 * DELETE /api/agenda/:id/assign-worker/:peserta_id - remove assignment (admin)
 */
router.delete('/:id/assign-worker/:peserta_id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id, peserta_id } = req.params;
  await pool.execute('DELETE FROM agenda_worker WHERE agenda_id = ? AND peserta_id = ?', [id, peserta_id]);
  res.json({ success: true });
}));

/**
 * GET /api/agenda/:id/quiz - list quiz in an agenda
 */
router.get('/:id/quiz', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [agendaRows] = await pool.execute('SELECT id, nama FROM agenda WHERE id = ?', [id]);
  if (agendaRows.length === 0) throw new ApiError(404, 'Agenda not found');

  const [quizRows] = await pool.execute(
    `SELECT s.id, s.nama, s.tipe, s.status, s.waktu_mulai, s.waktu_selesai,
            s.daftar_soal_id, ds.nama AS daftar_soal_nama,
            s.pos_id, p.nama AS pos_nama
     FROM quiz s
     LEFT JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     LEFT JOIN pos p ON s.pos_id = p.id
     WHERE s.agenda_id = ? ORDER BY s.id`,
    [id]
  );

  res.json({
    success: true,
    data: {
      agenda: agendaRows[0],
      quiz: quizRows,
      total: quizRows.length,
    },
  });
}));

/**
 * GET /api/agenda/:id/leaderboard - leaderboard for agenda
 * Merges leaderboard JSON from all quiz in this agenda
 */
router.get('/:id/leaderboard', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [agendaRows] = await pool.execute('SELECT id, nama FROM agenda WHERE id = ?', [id]);
  if (agendaRows.length === 0) throw new ApiError(404, 'Agenda not found');

  // Get all quiz in this agenda with their leaderboards
  const [quizRows] = await pool.execute('SELECT id, nama, tipe, leaderboard FROM quiz WHERE agenda_id = ?', [id]);

  // Merge all leaderboard JSONs
  const scoreMap = {}; // key -> { nama, skor, kelompok_id? }

  for (const quiz of quizRows) {
    if (!quiz.leaderboard) continue;
    const lb = JSON.parse(quiz.leaderboard);
    // Skip internal tracking field
    delete lb._answeredSoals;

    for (const [key, entry] of Object.entries(lb)) {
      if (!scoreMap[key]) {
        scoreMap[key] = { nama: entry.nama, skor: 0 };
      }
      scoreMap[key].skor += entry.skor || 0;
      // Track kelompok_id if present (kelompok entries are numeric IDs)
      if (quiz.tipe === 'kelompok') {
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
      agenda: agendaRows[0],
      leaderboard,
    },
  });
}));

module.exports = router;
