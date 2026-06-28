const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReviewSchema, uploadReviewSchema, gradeReviewSchema } = require('../utils/schemas');

const router = express.Router();

// Ensure base upload directory exists
const BASE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'review');
if (!fs.existsSync(BASE_UPLOAD_DIR)) {
  fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
}

/**
 * GET /api/review - list all review (admin, worker)
 */
router.get('/', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT id, nama, deskripsi, status, created_at FROM review ORDER BY id');
  res.json({ success: true, data: rows });
}));

/**
 * POST /api/review - create review with kelompok assignment (admin only)
 * Body: { nama, deskripsi?, kelompok_ids: number[] }
 */
router.post('/', authenticate, authorize('admin'), validate(createReviewSchema), asyncHandler(async (req, res) => {
  const { nama, deskripsi, kelompok_ids } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [reviewResult] = await connection.execute(
      'INSERT INTO review (nama, deskripsi, status) VALUES (?, ?, ?)',
      [nama, deskripsi || null, 'active']
    );
    const reviewId = reviewResult.insertId;

    for (const kelompokId of kelompok_ids) {
      await connection.execute(
        'INSERT INTO review_kelompok (review_id, kelompok_id) VALUES (?, ?)',
        [reviewId, kelompokId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: reviewId,
        nama,
        deskripsi: deskripsi || null,
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
 * GET /api/review/:id - review detail with submissions
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [reviewRows] = await pool.execute('SELECT id, nama, deskripsi, status, created_at FROM review WHERE id = ?', [id]);
  if (reviewRows.length === 0) throw new ApiError(404, 'Review not found');
  const review = reviewRows[0];

  const [kelompokRows] = await pool.execute(
    `SELECT k.id, k.nama FROM kelompok k
     INNER JOIN review_kelompok rk ON k.id = rk.kelompok_id
     WHERE rk.review_id = ? ORDER BY k.id`,
    [id]
  );

  let submissions = [];
  if (req.user.role === 'peserta') {
    // Peserta only sees their own kelompok submissions
    const [subRows] = await pool.execute(
      `SELECT rs.id, rs.review_id, rs.kelompok_id, rs.pos_id, rs.foto_url, rs.caption,
              rs.nilai, rs.status, rs.created_at, rs.updated_at,
              k.nama AS kelompok_nama, p.nama AS pos_nama
       FROM review_submission rs
       LEFT JOIN kelompok k ON rs.kelompok_id = k.id
       LEFT JOIN pos p ON rs.pos_id = p.id
       WHERE rs.review_id = ? AND rs.kelompok_id = ?
       ORDER BY rs.created_at DESC`,
      [id, req.user.kelompok_id]
    );
    submissions = subRows;
  } else {
    const [subRows] = await pool.execute(
      `SELECT rs.id, rs.review_id, rs.kelompok_id, rs.pos_id, rs.foto_url, rs.caption,
              rs.nilai, rs.status, rs.created_at, rs.updated_at,
              k.nama AS kelompok_nama, p.nama AS pos_nama
       FROM review_submission rs
       LEFT JOIN kelompok k ON rs.kelompok_id = k.id
       LEFT JOIN pos p ON rs.pos_id = p.id
       WHERE rs.review_id = ?
       ORDER BY rs.created_at DESC`,
      [id]
    );
    submissions = subRows;
  }

  res.json({
    success: true,
    data: {
      ...review,
      kelompok: kelompokRows,
      submissions,
    },
  });
}));

/**
 * GET /api/review/:id/leaderboard - per-kelompok leaderboard for review
 * Sum nilai from review_submission grouped by kelompok
 */
router.get('/:id/leaderboard', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [reviewRows] = await pool.execute('SELECT id, nama FROM review WHERE id = ?', [id]);
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
    [id]
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

/**
 * GET /api/review/:id/submissions - list submissions
 * admin sees all, kelompok (peserta) sees own
 */
router.get('/:id/submissions', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [reviewRows] = await pool.execute('SELECT id, nama FROM review WHERE id = ?', [id]);
  if (reviewRows.length === 0) throw new ApiError(404, 'Review not found');

  let sql = `SELECT rs.id, rs.review_id, rs.kelompok_id, rs.pos_id, rs.foto_url, rs.caption,
                    rs.nilai, rs.status, rs.created_at, rs.updated_at,
                    k.nama AS kelompok_nama, p.nama AS pos_nama
             FROM review_submission rs
             LEFT JOIN kelompok k ON rs.kelompok_id = k.id
             LEFT JOIN pos p ON rs.pos_id = p.id
             WHERE rs.review_id = ?`;
  const params = [id];

  if (req.user.role === 'peserta') {
    sql += ' AND rs.kelompok_id = ?';
    params.push(req.user.kelompok_id);
  }

  sql += ' ORDER BY rs.created_at DESC';

  const [rows] = await pool.execute(sql, params);

  res.json({
    success: true,
    data: {
      review: reviewRows[0],
      submissions: rows,
      total: rows.length,
    },
  });
}));

/**
 * POST /api/review/:id/upload - upload photo (admin, worker on behalf of kelompok)
 * Body (multipart/form-data): { kelompok_id, pos_id, caption?, file }
 * Save file locally to uploads/review/{review_id}/{kelompok_id}/{pos_id}/
 */
router.post('/:id/upload', authenticate, authorize('admin', 'worker'), (req, res, next) => {
  const { id: reviewId } = req.params;

  // Dynamic storage based on review_id
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const { kelompok_id, pos_id } = req.body;
      const destDir = path.join(BASE_UPLOAD_DIR, String(reviewId), String(kelompok_id || '0'), String(pos_id || '0'));
      fs.mkdirSync(destDir, { recursive: true });
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const filename = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, filename);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, 'Only image files are allowed'));
      }
    },
  }).single('file');

  upload(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}, validate(uploadReviewSchema), asyncHandler(async (req, res) => {
  const { id: reviewId } = req.params;
  const { kelompok_id, pos_id, caption } = req.body;

  if (!req.file) throw new ApiError(400, 'No file uploaded');

  const [reviewRows] = await pool.execute('SELECT id FROM review WHERE id = ?', [reviewId]);
  if (reviewRows.length === 0) throw new ApiError(404, 'Review not found');

  const [posRows] = await pool.execute('SELECT id FROM pos WHERE id = ?', [pos_id]);
  if (posRows.length === 0) throw new ApiError(404, 'Pos not found');

  const [kelompokRows] = await pool.execute('SELECT id FROM kelompok WHERE id = ?', [kelompok_id]);
  if (kelompokRows.length === 0) throw new ApiError(404, 'Kelompok not found');

  // Build foto_url relative to uploads
  const fotoUrl = `/uploads/review/${reviewId}/${kelompok_id}/${pos_id}/${req.file.filename}`;

  const [result] = await pool.execute(
    `INSERT INTO review_submission (review_id, kelompok_id, pos_id, foto_url, caption, nilai, status)
     VALUES (?, ?, ?, ?, ?, 0, 'pending')`,
    [reviewId, kelompok_id, pos_id, fotoUrl, caption || null]
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('review_submitted', {
      submission_id: result.insertId,
      review_id: parseInt(reviewId),
      kelompok_id: parseInt(kelompok_id),
      pos_id: parseInt(pos_id),
      foto_url: fotoUrl,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    data: {
      submission_id: result.insertId,
      review_id: parseInt(reviewId),
      kelompok_id: parseInt(kelompok_id),
      pos_id: parseInt(pos_id),
      foto_url: fotoUrl,
      caption: caption || null,
      status: 'pending',
      message: 'Photo uploaded successfully. Awaiting grading.',
    },
  });
}));

/**
 * PUT /api/review/:id/grade - grade a submission (admin only)
 * Body: { submission_id, nilai: 0-100 }
 */
router.put('/:id/grade', authenticate, authorize('admin'), validate(gradeReviewSchema), asyncHandler(async (req, res) => {
  const { id: reviewId } = req.params;
  const { submission_id, nilai } = req.body;

  const [existing] = await pool.execute(
    'SELECT id, kelompok_id, pos_id FROM review_submission WHERE id = ? AND review_id = ?',
    [submission_id, reviewId]
  );
  if (existing.length === 0) throw new ApiError(404, 'Submission not found');

  await pool.execute(
    'UPDATE review_submission SET nilai = ?, status = ?, updated_at = NOW() WHERE id = ?',
    [nilai, 'graded', submission_id]
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('review_graded', {
      submission_id,
      review_id: parseInt(reviewId),
      kelompok_id: existing[0].kelompok_id,
      pos_id: existing[0].pos_id,
      nilai,
      timestamp: new Date().toISOString(),
    });
    io.emit('leaderboard_updated', {
      kelompok_id: existing[0].kelompok_id,
      review_id: parseInt(reviewId),
      action: 'review_graded',
      nilai,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    data: {
      submission_id,
      review_id: parseInt(reviewId),
      nilai,
      status: 'graded',
      message: 'Submission graded successfully',
    },
  });
}));

module.exports = router;
