const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/foto-gallery
 */
router.get('/foto-gallery', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT sa.id, sa.peserta_id, sa.quiz_id, sa.lokasi_pos_id, sa.foto_url, sa.caption,
            sa.validasi_status, sa.poin_diberikan, sa.created_at, p.nama, lp.nama_pos, q.nama AS quiz_nama
     FROM submission_aktivitas sa
     LEFT JOIN peserta p ON sa.peserta_id = p.id
     LEFT JOIN lokasi_pos lp ON sa.lokasi_pos_id = lp.id
     LEFT JOIN quiz q ON sa.quiz_id = q.id
     ORDER BY sa.created_at DESC`
  );
  res.json({ success: true, data: rows });
}));

/**
 * GET /api/admin/dashboard-stats
 */
router.get('/dashboard-stats', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const [[pesertaCount]] = await pool.execute('SELECT COUNT(*) as count FROM peserta');
  const [[quizCount]] = await pool.execute('SELECT COUNT(*) as count FROM quiz');
  const [[posCount]] = await pool.execute('SELECT COUNT(*) as count FROM lokasi_pos');
  const [[submissionCount]] = await pool.execute('SELECT COUNT(*) as count FROM submission_aktivitas');
  const [[pendingCount]] = await pool.execute("SELECT COUNT(*) as count FROM submission_aktivitas WHERE validasi_status = 'pending'");

  const [recentSubmissions] = await pool.execute(
    `SELECT sa.id, sa.peserta_id, sa.foto_url, sa.validasi_status, sa.created_at, p.nama
     FROM submission_aktivitas sa
     LEFT JOIN peserta p ON sa.peserta_id = p.id
     ORDER BY sa.created_at DESC LIMIT 10`
  );

  const [activeQuizzes] = await pool.execute("SELECT id, nama, status FROM quiz WHERE status = 'active' ORDER BY created_at DESC");

  res.json({
    success: true,
    data: {
      totals: {
        peserta: pesertaCount.count,
        quiz: quizCount.count,
        pos: posCount.count,
        submissions: submissionCount.count,
        pending_validations: pendingCount.count,
      },
      active_quizzes: activeQuizzes,
      recent_submissions: recentSubmissions,
    },
  });
}));

module.exports = router;
