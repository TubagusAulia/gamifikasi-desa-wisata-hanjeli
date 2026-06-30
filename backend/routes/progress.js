const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function buildSubmissionMap(submissions) {
  const map = {};
  (submissions || []).forEach(s => { map[s.lokasi_pos_id] = s; });
  return map;
}

function buildProgressEntry(pos, progressRows, submissionMap) {
  const prog = (progressRows || []).find(p => p.lokasi_pos_id === pos.id);
  const submission = submissionMap[pos.id];
  return {
    pos_id: pos.id,
    pos_nama: pos.nama_pos,
    status: prog ? prog.status_completion : 'not_started',
    quiz_score: prog ? prog.quiz_score : null,
    photo_submitted: prog ? (prog.photo_submitted === 1) : false,
    photo_status: submission ? submission.validasi_status : null,
    poin: submission ? submission.poin_diberikan : 0,
    completion_time: prog ? prog.completion_time : null,
  };
}

function countCompleted(progressList) {
  return progressList.filter(p => p.status === 'completed' || p.status === 'photo_done').length;
}

/**
 * GET /api/progress/:peserta_id/:quiz_id
 */
router.get('/:peserta_id/:quiz_id', authenticate, asyncHandler(async (req, res) => {
  const { peserta_id, quiz_id } = req.params;

  if (req.user.role === 'peserta' && req.user.id !== parseInt(peserta_id)) {
    throw new ApiError(403, 'Can only view your own progress');
  }

  const [posRows] = await pool.execute('SELECT id, nama_pos FROM lokasi_pos WHERE quiz_id = ?', [quiz_id]);
  const [progressRows] = await pool.execute(
    `SELECT id, peserta_id, quiz_id, lokasi_pos_id, status_completion, quiz_score, photo_submitted, completion_time, created_at, updated_at
     FROM progress_peserta WHERE peserta_id = ? AND quiz_id = ?`,
    [peserta_id, quiz_id]
  );
  const [submissions] = await pool.execute(
    'SELECT lokasi_pos_id, validasi_status, poin_diberikan FROM submission_aktivitas WHERE peserta_id = ? AND quiz_id = ?',
    [peserta_id, quiz_id]
  );

  const submissionMap = buildSubmissionMap(submissions);
  const progressList = (posRows || []).map(pos => buildProgressEntry(pos, progressRows, submissionMap));
  const completed = countCompleted(progressList);
  const total = progressList.length;

  res.json({
    success: true,
    data: {
      peserta_id: parseInt(peserta_id),
      quiz_id: parseInt(quiz_id),
      total_pos: total,
      completed_pos: completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      progress: progressList,
    },
  });
}));

function countCompletedPeserta(progressRows) {
  const DONE = ['completed', 'photo_done'];
  return (progressRows || []).filter(p => DONE.includes(p.status_completion)).length;
}

/**
 * GET /api/progress/session-recap/:quiz_id
 */
router.get('/session-recap/:quiz_id', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { quiz_id } = req.params;

  const [quizRows] = await pool.execute('SELECT id, nama, status FROM quiz WHERE id = ?', [quiz_id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Session not found');

  const [pesertaRows] = await pool.execute('SELECT id FROM peserta WHERE kelompok_id IS NOT NULL');
  const [progressRows] = await pool.execute("SELECT status_completion FROM progress_peserta WHERE quiz_id = ?", [quiz_id]);
  const [pendingRows] = await pool.execute("SELECT id FROM submission_aktivitas WHERE quiz_id = ? AND validasi_status = 'pending'", [quiz_id]);
  const [posRows] = await pool.execute('SELECT id FROM lokasi_pos WHERE quiz_id = ?', [quiz_id]);

  const totalPeserta = pesertaRows.length;
  const completedPeserta = countCompletedPeserta(progressRows);

  res.json({
    success: true,
    data: {
      quiz_info: { id: quizRows[0].id, nama: quizRows[0].nama, status: quizRows[0].status },
      total_peserta: totalPeserta,
      completed_peserta: completedPeserta,
      completion_rate: totalPeserta > 0 ? Math.round((completedPeserta / totalPeserta) * 100) + '%' : '0%',
      total_pos: posRows.length,
      pending_photo_validation: pendingRows.length,
    },
  });
}));

module.exports = router;
