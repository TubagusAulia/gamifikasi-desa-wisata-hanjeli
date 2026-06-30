const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createQuizSchema,
  updateQuizSchema,
  submitJawabanSchema,
  kelompokAnswerSchema,
} = require('../utils/schemas');
const { generateQuizPassword } = require('../utils/password');

const router = express.Router();

/**
 * POST /api/quiz - create quiz (admin only)
 * Body: { agenda_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status }
 */
router.post('/', authenticate, authorize('admin'), validate(createQuizSchema), asyncHandler(async (req, res) => {
  const { agenda_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status, password } = req.body;

  // Validate foreign keys
  const [agendaRows] = await pool.execute('SELECT id, no_phone_policy FROM agenda WHERE id = ?', [agenda_id]);
  if (agendaRows.length === 0) throw new ApiError(404, 'Agenda not found');

  const [daftarRows] = await pool.execute('SELECT id FROM daftar_soal WHERE id = ?', [daftar_soal_id]);
  if (daftarRows.length === 0) throw new ApiError(404, 'Daftar soal not found');

  const [posRows] = await pool.execute('SELECT id FROM pos WHERE id = ?', [pos_id]);
  if (posRows.length === 0) throw new ApiError(404, 'Pos not found');

  // Auto-set tipe based on agenda no_phone_policy if not explicitly provided
  let finalTipe = tipe;
  if (!finalTipe) {
    finalTipe = agendaRows[0].no_phone_policy ? 'kelompok' : 'individu';
  }

  // Auto-generate 5-char UPPERCASE password if not provided
  const finalPassword = password || generateQuizPassword();

  const [result] = await pool.execute(
    'INSERT INTO quiz (agenda_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [agenda_id, daftar_soal_id, pos_id, nama, finalTipe, waktu_mulai || null, waktu_selesai || null, status || 'inactive', finalPassword]
  );

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      agenda_id,
      daftar_soal_id,
      pos_id,
      nama,
      tipe: finalTipe,
      waktu_mulai: waktu_mulai || null,
      waktu_selesai: waktu_selesai || null,
      status: status || 'inactive',
      password: finalPassword,
    },
  });
}));

/**
 * GET /api/quiz/:id - quiz detail with pos info, question count, and submission status
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [quizRows] = await pool.execute(
    `SELECT s.id, s.agenda_id, s.daftar_soal_id, s.pos_id, s.nama, s.tipe,
            s.waktu_mulai, s.waktu_selesai, s.status, s.password, s.created_at,
            a.nama AS agenda_nama, ds.nama AS daftar_soal_nama,
            p.nama AS pos_nama, p.latitude, p.longitude, p.radius_meter
     FROM quiz s
     LEFT JOIN agenda a ON s.agenda_id = a.id
     LEFT JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     LEFT JOIN pos p ON s.pos_id = p.id
     WHERE s.id = ?`,
    [id]
  );
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  const quiz = quizRows[0];

  const [[soalCount]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM soal WHERE daftar_soal_id = ?',
    [quiz.daftar_soal_id]
  );

  // Check if current user has already submitted (one-time attempt)
  let hasSubmitted = false;
  if (req.user.role === 'peserta') {
    const leaderboard = quiz.leaderboard ? JSON.parse(quiz.leaderboard) : {};
    if (quiz.tipe === 'individu') {
      hasSubmitted = !!leaderboard[req.user.id];
    } else {
      // For kelompok, check if user's kelompok is in leaderboard
      hasSubmitted = !!leaderboard[req.user.kelompok_id];
    }
  }

  res.json({
    success: true,
    data: {
      ...quiz,
      question_count: soalCount.count,
      has_submitted: hasSubmitted,
    },
  });
}));

/**
 * PUT /api/quiz/:id - update quiz (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), validate(updateQuizSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const [existing] = await pool.execute('SELECT id FROM quiz WHERE id = ?', [id]);
  if (existing.length === 0) throw new ApiError(404, 'Quiz not found');

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
  await pool.execute(`UPDATE quiz SET ${fields.join(', ')} WHERE id = ?`, values);

  const [rows] = await pool.execute('SELECT * FROM quiz WHERE id = ?', [id]);
  res.json({ success: true, data: rows[0], message: 'Quiz updated successfully' });
}));

/**
 * GET /api/quiz/:id/soal - get questions for a quiz (from daftar_soal)
 * For individual: return questions with options (hide correct answer)
 * For kelompok: return questions only (no options)
 */
router.get('/:id/soal', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [quizRows] = await pool.execute(
    'SELECT id, agenda_id, daftar_soal_id, nama, tipe FROM quiz WHERE id = ?',
    [id]
  );
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  const quiz = quizRows[0];

  const [soalRows] = await pool.execute(
    'SELECT id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, poin FROM soal WHERE daftar_soal_id = ? ORDER BY id',
    [quiz.daftar_soal_id]
  );

  // Return questions with options and correct answer (admin view)
  const questions = soalRows.map(s => ({
    id: s.id,
    pertanyaan: s.pertanyaan,
    opsi_a: s.opsi_a,
    opsi_b: s.opsi_b,
    opsi_c: s.opsi_c,
    opsi_d: s.opsi_d,
    jawaban_benar: s.jawaban_benar,
    penjelasan_jawaban_benar: s.penjelasan_jawaban_benar,
    poin: s.poin,
  }));

  res.json({
    success: true,
    data: {
      quiz: {
        id: quiz.id,
        nama: quiz.nama,
        tipe: quiz.tipe,
        agenda_id: quiz.agenda_id,
      },
      questions,
      total: questions.length,
    },
  });
}));

/**
 * POST /api/quiz/:id/submit - submit individual quiz answer (peserta only)
 * Body: { peserta_id, answers: [{ soal_id, jawaban }] }
 * Computes score and stores in quiz.leaderboard JSON. One attempt per user.
 */
router.post('/:id/submit', authenticate, authorize('peserta'), validate(submitJawabanSchema), asyncHandler(async (req, res) => {
  const { id: quizId } = req.params;
  const { peserta_id, answers } = req.body;

  if (req.user.id !== peserta_id) {
    throw new ApiError(403, 'Can only submit your own answers');
  }

  const [quizRows] = await pool.execute('SELECT id, agenda_id, daftar_soal_id, tipe, leaderboard FROM quiz WHERE id = ?', [quizId]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  const quiz = quizRows[0];
  if (quiz.tipe !== 'individu') {
    throw new ApiError(400, 'This quiz is not individual type');
  }

  // Check if already submitted (one attempt per user)
  let leaderboard = quiz.leaderboard ? JSON.parse(quiz.leaderboard) : {};
  if (leaderboard[peserta_id]) {
    throw new ApiError(400, 'You have already submitted this quiz');
  }

  // Get correct answers for the daftar_soal
  const [soalRows] = await pool.execute(
    'SELECT id, jawaban_benar, poin FROM soal WHERE daftar_soal_id = ?',
    [quiz.daftar_soal_id]
  );
  if (soalRows.length === 0) throw new ApiError(404, 'No questions found for this quiz');

  const soalMap = {};
  soalRows.forEach(s => { soalMap[s.id] = s; });

  // Compute score
  let totalSkor = 0;
  let correctCount = 0;

  for (const ans of answers) {
    const soal = soalMap[ans.soal_id];
    if (!soal) continue;
    const isCorrect = ans.jawaban.toLowerCase().trim() === (soal.jawaban_benar || '').toLowerCase().trim();
    if (isCorrect) {
      totalSkor += (soal.poin || 1);
      correctCount++;
    }
  }

  // Get peserta name
  const [pesertaRows] = await pool.execute('SELECT nama FROM peserta WHERE id = ?', [peserta_id]);
  const pesertaNama = pesertaRows[0]?.nama || `User ${peserta_id}`;

  // Update leaderboard JSON
  leaderboard[peserta_id] = { nama: pesertaNama, skor: totalSkor };
  await pool.execute(
    'UPDATE quiz SET leaderboard = ? WHERE id = ?',
    [JSON.stringify(leaderboard), quizId]
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('quiz_completed', {
      peserta_id,
      quiz_id: parseInt(quizId),
      skor: totalSkor,
      jumlah_benar: correctCount,
      timestamp: new Date().toISOString(),
    });
    io.emit('leaderboard_updated', {
      quiz_id: parseInt(quizId),
      leaderboard,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    data: {
      quiz_id: parseInt(quizId),
      peserta_id,
      skor: totalSkor,
      jumlah_benar: correctCount,
      total_soal: soalRows.length,
      message: `Quiz submitted! Score: ${totalSkor}`,
    },
  });
}));

/**
 * POST /api/quiz/:id/kelompok-answer - record kelompok quiz answer (admin, worker only)
 * Body: { kelompok_id, soal_id, peserta_id }
 * One answer per soal per kelompok (first to answer gets 1 point added to kelompok score)
 * Score stored in quiz.leaderboard JSON under kelompok_id key
 */
router.post('/:id/kelompok-answer', authenticate, authorize('admin', 'worker'), validate(kelompokAnswerSchema), asyncHandler(async (req, res) => {
  const { id: quizId } = req.params;
  const { kelompok_id, soal_id, peserta_id } = req.body;

  const [quizRows] = await pool.execute('SELECT id, agenda_id, tipe, leaderboard FROM quiz WHERE id = ?', [quizId]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  const quiz = quizRows[0];
  if (quiz.tipe !== 'kelompok') {
    throw new ApiError(400, 'This quiz is not kelompok type');
  }

  // Check if this soal already answered for this quiz
  const [soalRows] = await pool.execute(
    'SELECT id FROM soal WHERE id = ? AND daftar_soal_id = ?',
    [soal_id, quiz.daftar_soal_id]
  );
  if (soalRows.length === 0) throw new ApiError(404, 'Soal not found in this quiz');

  // Use a tracked set in leaderboard to prevent duplicate answers per soal
  let leaderboard = quiz.leaderboard ? JSON.parse(quiz.leaderboard) : {};
  let answeredSoals = leaderboard._answeredSoals || [];

  if (answeredSoals.includes(soal_id)) {
    res.json({
      success: false,
      message: 'Soal already answered for this quiz',
      data: { already_answered: true },
    });
    return;
  }

  // Get kelompok name
  const [kelompokRows] = await pool.execute('SELECT nama FROM kelompok WHERE id = ?', [kelompok_id]);
  const kelompokNama = kelompokRows[0]?.nama || `Kelompok ${kelompok_id}`;

  // Add 1 point to kelompok score
  if (!leaderboard[kelompok_id]) {
    leaderboard[kelompok_id] = { nama: kelompokNama, skor: 0 };
  }
  leaderboard[kelompok_id].skor += 1;

  // Track which soals have been answered
  answeredSoals.push(soal_id);
  leaderboard._answeredSoals = answeredSoals;

  await pool.execute(
    'UPDATE quiz SET leaderboard = ? WHERE id = ?',
    [JSON.stringify(leaderboard), quizId]
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('kelompok_answer_recorded', {
      quiz_id: parseInt(quizId),
      kelompok_id,
      soal_id,
      peserta_id,
      timestamp: new Date().toISOString(),
    });
    io.emit('leaderboard_updated', {
      quiz_id: parseInt(quizId),
      leaderboard,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    data: {
      quiz_id: parseInt(quizId),
      kelompok_id,
      skor: leaderboard[kelompok_id].skor,
      message: 'Kelompok answer recorded',
    },
  });
}));

module.exports = router;
