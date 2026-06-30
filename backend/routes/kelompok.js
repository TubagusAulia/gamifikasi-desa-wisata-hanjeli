const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createKelompokSchema } = require('../utils/schemas');
const { generatePesertaPassword } = require('../utils/password');

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
      // Generate random 8-char password (lowercase + numbers)
      const password = p.password || generatePesertaPassword();
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
        password,
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

  const pesertaWithPassword = pesertaRows.map((p) => ({
    ...p,
    password: 'password123',
    userclass: p.role || 'peserta',
  }));

  res.json({
    success: true,
    data: {
      ...kelompok,
      peserta: pesertaWithPassword,
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

  const pesertaWithPassword = pesertaRows.map((p) => ({
    ...p,
    password: 'password123',
    userclass: p.role || 'peserta',
  }));

  res.json({
    success: true,
    data: {
      kelompok: kelompokRows[0],
      peserta: pesertaWithPassword,
      total: pesertaWithPassword.length,
    },
  });
}));

/**
 * POST /api/kelompok/:id/peserta - add a single peserta to an existing kelompok (admin only)
 * Body: { nama: string }
 */
router.post('/:id/peserta', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id: kelompokId } = req.params;
  const { nama } = req.body;

  if (!nama || !nama.trim()) {
    throw new ApiError(400, 'Nama peserta is required');
  }

  const [kelompokRows] = await pool.execute('SELECT id FROM kelompok WHERE id = ?', [kelompokId]);
  if (kelompokRows.length === 0) throw new ApiError(404, 'Kelompok not found');

  const email = `${nama.toLowerCase().replace(/\s+/g, '.')}@peserta.com`;
  const password = generatePesertaPassword();
  const password_hash = await bcrypt.hash(password, 10);

  // Check for duplicate email
  const [existing] = await pool.execute('SELECT id FROM peserta WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    throw new ApiError(409, `Email already registered: ${email}`);
  }

  const [result] = await pool.execute(
    'INSERT INTO peserta (nama, email, password_hash, role, kelompok_id) VALUES (?, ?, ?, ?, ?)',
    [nama.trim(), email, password_hash, 'peserta', kelompokId]
  );

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      nama: nama.trim(),
      email,
      password,
      role: 'peserta',
      userclass: 'peserta',
      kelompok_id: Number(kelompokId),
    },
  });
}));

/**
 * GET /api/kelompok/:id/agenda - list agenda assigned to kelompok (admin, worker)
 */
router.get('/:id/agenda', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [kelompokRows] = await pool.execute('SELECT id, nama FROM kelompok WHERE id = ?', [id]);
  if (kelompokRows.length === 0) throw new ApiError(404, 'Kelompok not found');

  const [agendaRows] = await pool.execute(
    `SELECT a.id, a.nama, a.deskripsi, a.status, a.created_at
     FROM agenda a
     INNER JOIN agenda_kelompok ak ON a.id = ak.agenda_id
     WHERE ak.kelompok_id = ?
     ORDER BY a.id`,
    [id]
  );

  // Embed each agenda's quiz (with time window + pos) so the per-quiz list can render
  // and its availability can be decided from the schedule instead of a manual toggle.
  const agendaIds = agendaRows.map((a) => a.id);
  let quizMap = {};
  if (agendaIds.length > 0) {
    const placeholders = agendaIds.map(() => '?').join(',');
    const [quizRows] = await pool.execute(
      `SELECT q.id, q.agenda_id, q.nama, q.tipe, q.status, q.waktu_mulai, q.waktu_selesai,
              p.nama AS pos_nama
       FROM quiz q
       LEFT JOIN pos p ON q.pos_id = p.id
       WHERE q.agenda_id IN (${placeholders})
       ORDER BY q.id`,
      agendaIds
    );
    quizRows.forEach((q) => {
      if (!quizMap[q.agenda_id]) quizMap[q.agenda_id] = [];
      quizMap[q.agenda_id].push(q);
    });
  }

  const agendaWithQuiz = agendaRows.map((a) => ({
    ...a,
    quiz: quizMap[a.id] || [],
  }));

  res.json({
    success: true,
    data: {
      kelompok: kelompokRows[0],
      agenda: agendaWithQuiz,
      total: agendaWithQuiz.length,
    },
  });
}));

module.exports = router;
