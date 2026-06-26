const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/leaderboard/sesi/:sesi_id - leaderboard for a specific sesi
 * For individual: rank by skor (correct answers), then by fastest submitted_at
 * For kelompok: rank by count of kelompok_answer entries
 */
router.get('/sesi/:sesi_id', authenticate, asyncHandler(async (req, res) => {
  const { sesi_id } = req.params;

  const [sesiRows] = await pool.execute('SELECT id, quiz_id, nama, tipe FROM sesi WHERE id = ?', [sesi_id]);
  if (sesiRows.length === 0) throw new ApiError(404, 'Sesi not found');

  const sesi = sesiRows[0];

  if (sesi.tipe === 'kelompok') {
    // Kelompok leaderboard: rank by count of kelompok_answer entries
    const [rows] = await pool.execute(
      `SELECT ka.kelompok_id, k.nama AS kelompok_nama, COUNT(*) AS total_jawaban
       FROM kelompok_answer ka
       LEFT JOIN kelompok k ON ka.kelompok_id = k.id
       WHERE ka.sesi_id = ?
       GROUP BY ka.kelompok_id, k.nama
       ORDER BY total_jawaban DESC`,
      [sesi_id]
    );

    const leaderboard = rows.map((r, index) => ({
      rank: index + 1,
      kelompok_id: r.kelompok_id,
      kelompok_nama: r.kelompok_nama,
      total_jawaban: r.total_jawaban,
    }));

    res.json({
      success: true,
      data: {
        sesi: { id: sesi.id, nama: sesi.nama, tipe: sesi.tipe, quiz_id: sesi.quiz_id },
        leaderboard,
      },
    });
  } else {
    // Individual leaderboard: rank by skor, then by fastest submitted_at
    const [rows] = await pool.execute(
      `SELECT j.peserta_id, p.nama, p.kelompok_id, k.nama AS kelompok_nama,
              SUM(j.skor) AS total_skor,
              SUM(j.benar) AS total_benar,
              MAX(j.submitted_at) AS last_submitted
       FROM jawaban j
       LEFT JOIN peserta p ON j.peserta_id = p.id
       LEFT JOIN kelompok k ON p.kelompok_id = k.id
       WHERE j.sesi_id = ?
       GROUP BY j.peserta_id, p.nama, p.kelompok_id, k.nama
       ORDER BY total_skor DESC, last_submitted ASC`,
      [sesi_id]
    );

    const leaderboard = rows.map((r, index) => ({
      rank: index + 1,
      peserta_id: r.peserta_id,
      nama: r.nama,
      kelompok_id: r.kelompok_id,
      kelompok_nama: r.kelompok_nama,
      total_skor: r.total_skor || 0,
      total_benar: r.total_benar || 0,
      last_submitted: r.last_submitted,
    }));

    res.json({
      success: true,
      data: {
        sesi: { id: sesi.id, nama: sesi.nama, tipe: sesi.tipe, quiz_id: sesi.quiz_id },
        leaderboard,
      },
    });
  }
}));

/**
 * GET /api/leaderboard/quiz/:quiz_id - leaderboard for entire quiz
 * Aggregate across all sesi in quiz
 */
router.get('/quiz/:quiz_id', authenticate, asyncHandler(async (req, res) => {
  const { quiz_id } = req.params;

  const [quizRows] = await pool.execute('SELECT id, nama FROM quiz WHERE id = ?', [quiz_id]);
  if (quizRows.length === 0) throw new ApiError(404, 'Quiz not found');

  // Get all sesi in this quiz
  const [sesiRows] = await pool.execute('SELECT id, tipe, nama FROM sesi WHERE quiz_id = ?', [quiz_id]);
  const sesiIds = sesiRows.map(s => s.id);

  const scoreMap = {}; // key -> { ..., total_skor }

  if (sesiIds.length > 0) {
    const placeholders = sesiIds.map(() => '?').join(',');

    // Individual scores from jawaban
    const [jawabanRows] = await pool.execute(
      `SELECT j.peserta_id, SUM(j.skor) AS total_skor, SUM(j.benar) AS total_benar
       FROM jawaban j
       WHERE j.sesi_id IN (${placeholders})
       GROUP BY j.peserta_id`,
      sesiIds
    );

    jawabanRows.forEach(j => {
      if (!scoreMap[j.peserta_id]) {
        scoreMap[j.peserta_id] = { peserta_id: j.peserta_id, total_skor: 0, total_benar: 0, is_kelompok: false };
      }
      scoreMap[j.peserta_id].total_skor += j.total_skor || 0;
      scoreMap[j.peserta_id].total_benar += j.total_benar || 0;
    });

    // Kelompok scores from kelompok_answer
    const [kelompokRows] = await pool.execute(
      `SELECT ka.kelompok_id, COUNT(*) AS total_jawaban
       FROM kelompok_answer ka
       WHERE ka.sesi_id IN (${placeholders})
       GROUP BY ka.kelompok_id`,
      sesiIds
    );

    kelompokRows.forEach(k => {
      const key = `k_${k.kelompok_id}`;
      if (!scoreMap[key]) {
        scoreMap[key] = { kelompok_id: k.kelompok_id, total_skor: 0, is_kelompok: true };
      }
      scoreMap[key].total_skor += k.total_jawaban || 0;
    });

    // Attach peserta names
    const pesertaIds = Object.keys(scoreMap).filter(k => !scoreMap[k].is_kelompok).map(Number);
    if (pesertaIds.length > 0) {
      const pPlaceholders = pesertaIds.map(() => '?').join(',');
      const [pesertaInfo] = await pool.execute(
        `SELECT p.id, p.nama, p.kelompok_id, k.nama AS kelompok_nama
         FROM peserta p
         LEFT JOIN kelompok k ON p.kelompok_id = k.id
         WHERE p.id IN (${pPlaceholders})`,
        pesertaIds
      );
      pesertaInfo.forEach(p => {
        if (scoreMap[p.id]) {
          scoreMap[p.id].nama = p.nama;
          scoreMap[p.id].kelompok_id = p.kelompok_id;
          scoreMap[p.id].kelompok_nama = p.kelompok_nama;
        }
      });
    }

    // Attach kelompok names
    const kelompokIds = Object.keys(scoreMap).filter(k => scoreMap[k].is_kelompok).map(k => scoreMap[k].kelompok_id);
    if (kelompokIds.length > 0) {
      const kPlaceholders = kelompokIds.map(() => '?').join(',');
      const [kelompokInfo] = await pool.execute(
        `SELECT id, nama FROM kelompok WHERE id IN (${kPlaceholders})`,
        kelompokIds
      );
      const nameMap = {};
      kelompokInfo.forEach(k => { nameMap[k.id] = k.nama; });
      kelompokIds.forEach(kid => {
        const key = `k_${kid}`;
        if (scoreMap[key]) {
          scoreMap[key].nama = nameMap[kid] || `Kelompok ${kid}`;
          scoreMap[key].kelompok_nama = nameMap[kid] || `Kelompok ${kid}`;
        }
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
