const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/leaderboard/sesi/:sesi_id - leaderboard for a specific sesi
 * Returns the leaderboard JSON stored on sesi
 */
router.get('/sesi/:sesi_id', authenticate, asyncHandler(async (req, res) => {
  const { sesi_id } = req.params;

  const [sesiRows] = await pool.execute('SELECT id, quiz_id, nama, tipe, leaderboard FROM sesi WHERE id = ?', [sesi_id]);
  if (sesiRows.length === 0) throw new ApiError(404, 'Sesi not found');

  const sesi = sesiRows[0];
  const leaderboard = sesi.leaderboard ? JSON.parse(sesi.leaderboard) : {};

  // Remove internal tracking field
  delete leaderboard._answeredSoals;

  // Convert to array format
  const entries = Object.entries(leaderboard).map(([key, entry]) => ({
    peserta_id: isNaN(parseInt(key)) ? null : parseInt(key),
    nama: entry.nama,
    skor: entry.skor || 0,
  })).sort((a, b) => b.skor - a.skor).map((e, i) => ({ ...e, rank: i + 1 }));

  res.json({
    success: true,
    data: {
      sesi: { id: sesi.id, nama: sesi.nama, tipe: sesi.tipe, quiz_id: sesi.quiz_id },
      leaderboard: entries,
    },
  });
}));

/**
 * GET /api/leaderboard/quiz/:quiz_id - leaderboard for entire quiz
 * Merges leaderboard JSONs from all sesi in the quiz
 */
router.get('/quiz/:quiz_id', authenticate, asyncHandler(async (req, res) => {
  const { quiz_id } = req.params;

  const [quizRows] = await pool.execute('SELECT id, nama FROM quiz WHERE id = ?', [quiz_id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  const [sesiRows] = await pool.execute('SELECT id, nama, tipe, leaderboard FROM sesi WHERE quiz_id = ?', [quiz_id]);

  // Merge all leaderboard JSONs
  const scoreMap = {};
  for (const sesi of sesiRows) {
    if (!sesi.leaderboard) continue;
    const lb = JSON.parse(sesi.leaderboard);
    delete lb._answeredSoals;
    for (const [key, entry] of Object.entries(lb)) {
      if (!scoreMap[key]) scoreMap[key] = { nama: entry.nama, skor: 0 };
      scoreMap[key].skor += entry.skor || 0;
      if (sesi.tipe === 'kelompok') scoreMap[key].kelompok_id = parseInt(key);
    }
  }

  const leaderboard = Object.entries(scoreMap)
    .map(([key, entry]) => ({
      ...entry,
      peserta_id: isNaN(parseInt(key)) ? null : parseInt(key),
    }))
    .sort((a, b) => b.skor - a.skor)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  res.json({
    success: true,
    data: {
      quiz: quizRows[0],
      leaderboard,
    },
  });
}));

/**
 * GET /api/leaderboard/review/:review_id - leaderboard for review
 * Per-kelompok ranking by total nilai
 */
router.get('/review/:review_id', authenticate, asyncHandler(async (req, res) => {
  const { review_id } = req.params;

  const [reviewRows] = await pool.execute('SELECT id, nama FROM review WHERE id = ?', [review_id]);
  if (reviewRows.length === 0) throw new ApiError(404, 'Review not found');

  const [rows] = await pool.execute(
    `SELECT rs.kelompok_id, k.nama AS kelompok_nama,
            SUM(rs.nilai) AS total_nilai,
            COUNT(rs.id) AS total_submissions
     FROM review_submission rs
     LEFT JOIN kelompok k ON rs.kelompok_id = k.id
     WHERE rs.review_id = ?
     GROUP BY rs.kelompok_id, k.nama
     ORDER BY total_nilai DESC`,
    [review_id]
  );

  const leaderboard = rows.map((r, index) => ({
    rank: index + 1,
    kelompok_id: r.kelompok_id,
    kelompok_nama: r.kelompok_nama,
    total_nilai: r.total_nilai || 0,
    total_submissions: r.total_submissions,
  }));

  res.json({
    success: true,
    data: {
      review: reviewRows[0],
      leaderboard,
    },
  });
}));

module.exports = router;
