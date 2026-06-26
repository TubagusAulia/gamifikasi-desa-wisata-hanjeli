const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/progress/:peserta_id/:sesi_id
 */
router.get('/:peserta_id/:sesi_id', authenticate, asyncHandler(async (req, res) => {
  const { peserta_id, sesi_id } = req.params;

  if (req.user.role === 'peserta' && req.user.id !== parseInt(peserta_id)) {
    throw new ApiError(403, 'Can only view your own progress');
  }

  const [posRows] = await pool.execute('SELECT id, nama_pos FROM lokasi_pos WHERE sesi_id = ?', [sesi_id]);
  const [progressRows] = await pool.execute(
    `SELECT id, peserta_id, sesi_id, lokasi_pos_id, status_completion, quiz_score, photo_submitted, completion_time, created_at, updated_at
     FROM progress_peserta WHERE peserta_id = ? AND sesi_id = ?`,
    [peserta_id, sesi_id]
  );
  const [submissions] = await pool.execute(
    'SELECT lokasi_pos_id, validasi_status, poin_diberikan FROM submission_aktivitas WHERE peserta_id = ? AND sesi_id = ?',
    [peserta_id, sesi_id]
  );

  const submissionMap = {};
  (submissions || []).forEach(s => { submissionMap[s.lokasi_pos_id] = s; });

  const progressList = (posRows || []).map(pos => {
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
  });

  const completed = progressList.filter(p => p.status === 'completed' || p.status === 'photo_done').length;
  const total = progressList.length;

  res.json({
    success: true,
    data: {
      peserta_id: parseInt(peserta_id),
      sesi_id: parseInt(sesi_id),
      total_pos: total,
      completed_pos: completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      progress: progressList,
    },
  });
}));

/**
 * GET /api/progress/session-recap/:sesi_id
 */
router.get('/session-recap/:sesi_id', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { sesi_id } = req.params;

  const [sesiRows] = await pool.execute('SELECT id, nama_sesi, status FROM sesi WHERE id = ?', [sesi_id]);
  if (sesiRows.length === 0) throw new ApiError(404, 'Session not found');

  const [pesertaRows] = await pool.execute('SELECT id FROM peserta WHERE kelompok_id IS NOT NULL');
  const totalPeserta = pesertaRows.length;

  const [progressRows] = await pool.execute(
    "SELECT status_completion FROM progress_peserta WHERE sesi_id = ?",
    [sesi_id]
  );
  const completedPeserta = (progressRows || []).filter(p =>
    p.status_completion === 'completed' || p.status_completion === 'photo_done'
  ).length;

  const [pendingRows] = await pool.execute(
    "SELECT id FROM submission_aktivitas WHERE sesi_id = ? AND validasi_status = 'pending'",
    [sesi_id]
  );

  const [posRows] = await pool.execute('SELECT id FROM lokasi_pos WHERE sesi_id = ?', [sesi_id]);

  res.json({
    success: true,
    data: {
      sesi_info: { id: sesiRows[0].id, nama: sesiRows[0].nama_sesi, status: sesiRows[0].status },
      total_peserta: totalPeserta,
      completed_peserta: completedPeserta,
      completion_rate: totalPeserta > 0 ? Math.round((completedPeserta / totalPeserta) * 100) + '%' : '0%',
      total_pos: posRows.length,
      pending_photo_validation: pendingRows.length,
    },
  });
}));

module.exports = router;
