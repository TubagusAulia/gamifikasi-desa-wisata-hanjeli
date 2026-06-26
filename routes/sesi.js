const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createSesiSchema,
  updateSesiSchema,
  activateSesiSchema,
  submitJawabanSchema,
  kelompokAnswerSchema,
} = require('../utils/schemas');

const router = express.Router();

/**
 * POST /api/sesi - create sesi (admin only)
 * Body: { quiz_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status }
 */
router.post('/', authenticate, authorize('admin'), validate(createSesiSchema), asyncHandler(async (req, res) => {
  const { quiz_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status } = req.body;

  // Validate foreign keys
  const [quizRows] = await pool.execute('SELECT id FROM quiz WHERE id = ?', [quiz_id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  const [daftarRows] = await pool.execute('SELECT id FROM daftar_soal WHERE id = ?', [daftar_soal_id]);
  if (daftarRows.length === 0) throw new ApiError(404, 'Daftar soal not found');

  const [posRows] = await pool.execute('SELECT id FROM pos WHERE id = ?', [pos_id]);
  if (posRows.length === 0) throw new ApiError(404, 'Pos not found');

  const [result] = await pool.execute(
    'INSERT INTO sesi (quiz_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [quiz_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai || null, waktu_selesai || null, status || 'inactive']
  );

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      quiz_id,
      daftar_soal_id,
      pos_id,
      nama,
      tipe,
      waktu_mulai: waktu_mulai || null,
      waktu_selesai: waktu_selesai || null,
      status: status || 'inactive',
    },
  });
}));

/**
 * GET /api/sesi/:id - sesi detail with pos info and question count
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [sesiRows] = await pool.execute(
    `SELECT s.id, s.quiz_id, s.daftar_soal_id, s.pos_id, s.nama, s.tipe,
            s.waktu_mulai, s.waktu_selesai, s.status, s.created_at,
            q.nama AS quiz_nama, ds.nama AS daftar_soal_nama,
            p.nama AS pos_nama, p.latitude, p.longitude, p.radius_meter
     FROM sesi s
     LEFT JOIN quiz q ON s.quiz_id = q.id
     LEFT JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     LEFT JOIN pos p ON s.pos_id = p.id
     WHERE s.id = ?`,
    [id]
  );
  if (sesiRows.length === 0) throw new ApiError(404, 'Sesi not found');

  const sesi = sesiRows[0];

  const [[soalCount]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM soal WHERE daftar_soal_id = ?',
    [sesi.daftar_soal_id]
  );

  res.json({
    success: true,
    data: {
      ...sesi,
      question_count: soalCount.count,
    },
  });
}));

/**
 * PUT /api/sesi/:id - update sesi (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), validate(updateSesiSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const [existing] = await pool.execute('SELECT id FROM sesi WHERE id = ?', [id]);
  if (existing.length === 0) throw new ApiError(404, 'Sesi not found');

  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) throw new ApiError(400, 'No fields to update');

  values.push(id);
  await pool.execute(`UPDATE sesi SET ${fields.join(', ')} WHERE id = ?`, values);

  const [rows] = await pool.execute('SELECT * FROM sesi WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0], message: 'Sesi updated successfully' });
}));

/**
 * PUT /api/sesi/:id/activate - activate sesi (admin, worker)
 * Body: { status: 'active' }
 */
router.put('/:id/activate', authenticate, authorize('admin', 'worker'), validate(activateSesiSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const [existing] = await pool.execute('SELECT id, nama FROM sesi WHERE id = ?', [id]);
  if (existing.length === 0) throw new ApiError(404, 'Sesi not found');

  await pool.execute('UPDATE sesi SET status = ? WHERE id = ?', [status, id]);

  const io = req.app.get('io');
  if (io) {
    io.emit('sesi_activated', {
      sesi_id: parseInt(id),
      nama: existing[0].nama,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    data: { id: parseInt(id), status, nama: existing[0].nama },
    message: `Sesi ${status === 'active' ? 'activated' : 'updated'} successfully`,
  });
}));

/**
 * GET /api/sesi/:id/soal - get questions for a sesi (from daftar_soal)
 * For individual: return questions with options (hide correct answer)
 * For kelompok: return questions only (no options)
 */
router.get('/:id/soal', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [sesiRows] = await pool.execute(
    'SELECT id, quiz_id, daftar_soal_id, nama, tipe FROM sesi WHERE id = ?',
    [id]
  );
  if (sesiRows.length === 0) throw new ApiError(404, 'Sesi not found');

  const sesi = sesiRows[0];

  const [soalRows] = await pool.execute(
    'SELECT id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, poin FROM soal WHERE daftar_soal_id = ? ORDER BY id',
    [sesi.daftar_soal_id]
  );

  let questions;
  if (sesi.tipe === 'kelompok') {
    // For kelompok: return questions only (no options, pekerja will ask aloud)
    questions = soalRows.map(s => ({
      id: s.id,
      pertanyaan: s.pertanyaan,
      poin: s.poin,
    }));
  } else {
    // For individual: return questions with options (hide correct answer)
    questions = soalRows.map(s => ({
      id: s.id,
      pertanyaan: s.pertanyaan,
      opsi_a: s.opsi_a,
      opsi_b: s.opsi_b,
      opsi_c: s.opsi_c,
      opsi_d: s.opsi_d,
      poin: s.poin,
    }));
  }

  res.json({
    success: true,
    data: {
      sesi: {
        id: sesi.id,
        nama: sesi.nama,
        tipe: sesi.tipe,
        quiz_id: sesi.quiz_id,
      },
      questions,
      total: questions.length,
    },
  });
}));

/**
 * POST /api/sesi/:id/submit - submit individual quiz answer (peserta only)
 * Body: { peserta_id, answers: [{ soal_id, jawaban }] }
 */
router.post('/:id/submit', authenticate, authorize('peserta'), validate(submitJawabanSchema), asyncHandler(async (req, res) => {
  const { id: sesiId } = req.params;
  const { peserta_id, answers } = req.body;

  // Ensure peserta only submits for themselves
  if (req.user.id !== peserta_id) {
    throw new ApiError(403, 'Can only submit your own answers');
  }

  const [sesiRows] = await pool.execute('SELECT id, quiz_id, daftar_soal_id, tipe FROM sesi WHERE id = ?', [sesiId]);
  if (sesiRows.length === 0) throw new ApiError(404, 'Sesi not found');

  const sesi = sesiRows[0];
  if (sesi.tipe !== 'individu') {
    throw new ApiError(400, 'This sesi is not individual type');
  }

  // Get correct answers for the daftar_soal
  const [soalRows] = await pool.execute(
    'SELECT id, jawaban_benar, poin FROM soal WHERE daftar_soal_id = ?',
    [sesi.daftar_soal_id]
  );
  if (soalRows.length === 0) throw new ApiError(404, 'No questions found for this sesi');

  const soalMap = {};
  soalRows.forEach(s => { soalMap[s.id] = s; });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let totalSkor = 0;
    let correctCount = 0;
    const results = [];

    for (const ans of answers) {
      const soal = soalMap[ans.soal_id];
      if (!soal) continue;

      const isCorrect = ans.jawaban.toLowerCase().trim() === (soal.jawaban_benar || '').toLowerCase().trim();
      const skor = isCorrect ? (soal.poin || 1) : 0;
      if (isCorrect) {
        totalSkor += skor;
        correctCount++;
      }

      await connection.execute(
        'INSERT INTO jawaban (peserta_id, sesi_id, soal_id, jawaban, benar, skor) VALUES (?, ?, ?, ?, ?, ?)',
        [peserta_id, sesiId, ans.soal_id, ans.jawaban, isCorrect ? 1 : 0, skor]
      );

      results.push({
        soal_id: ans.soal_id,
        jawaban: ans.jawaban,
        benar: isCorrect,
        skor,
      });
    }

    await connection.commit();

    const io = req.app.get('io');
    if (io) {
      io.emit('quiz_completed', {
        peserta_id,
        sesi_id: parseInt(sesiId),
        skor: totalSkor,
        jumlah_benar: correctCount,
        timestamp: new Date().toISOString(),
      });
      io.emit('leaderboard_updated', {
        peserta_id,
        sesi_id: parseInt(sesiId),
        action: 'quiz_completed',
        skor: totalSkor,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        sesi_id: parseInt(sesiId),
        peserta_id,
        skor: totalSkor,
        jumlah_benar: correctCount,
        total_soal: soalRows.length,
        results,
        message: `Quiz submitted! Score: ${totalSkor}`,
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
 * POST /api/sesi/:id/kelompok-answer - record kelompok quiz answer (admin, worker only)
 * Body: { kelompok_id, soal_id, peserta_id }
 * One answer per soal per sesi (first to answer gets the point)
 */
router.post('/:id/kelompok-answer', authenticate, authorize('admin', 'worker'), validate(kelompokAnswerSchema), asyncHandler(async (req, res) => {
  const { id: sesiId } = req.params;
  const { kelompok_id, soal_id, peserta_id } = req.body;

  const [sesiRows] = await pool.execute('SELECT id, quiz_id, tipe FROM sesi WHERE id = ?', [sesiId]);
  if (sesiRows.length === 0) throw new ApiError(404, 'Sesi not found');

  const sesi = sesiRows[0];
  if (sesi.tipe !== 'kelompok') {
    throw new ApiError(400, 'This sesi is not kelompok type');
  }

  // Check if already answered (first to answer gets the point)
  const [existing] = await pool.execute(
    'SELECT id FROM kelompok_answer WHERE sesi_id = ? AND soal_id = ? LIMIT 1',
    [sesiId, soal_id]
  );

  if (existing.length > 0) {
    res.json({
      success: false,
      message: 'Soal already answered for this sesi',
      data: { already_answered: true },
    });
    return;
  }

  const [result] = await pool.execute(
    'INSERT INTO kelompok_answer (sesi_id, kelompok_id, soal_id, peserta_id) VALUES (?, ?, ?, ?)',
    [sesiId, kelompok_id, soal_id, peserta_id]
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('kelompok_answer_recorded', {
      sesi_id: parseInt(sesiId),
      kelompok_id,
      soal_id,
      peserta_id,
      timestamp: new Date().toISOString(),
    });
    io.emit('leaderboard_updated', {
      kelompok_id,
      sesi_id: parseInt(sesiId),
      action: 'kelompok_answer',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      sesi_id: parseInt(sesiId),
      kelompok_id,
      soal_id,
      peserta_id,
      message: 'Kelompok answer recorded',
    },
  });
}));

module.exports = router;
