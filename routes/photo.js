const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { photoUploadSchema, validatePhotoSchema } = require('../utils/schemas');
const upload = require('../middleware/upload');
const { processPhoto, detectFace } = require('../utils/photoProcessor');

const router = express.Router();

/**
 * POST /api/photo/upload
 */
router.post('/upload', authenticate, authorize('peserta'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');

  const { peserta_id, sesi_id, lokasi_pos_id, caption } = req.body;
  if (!peserta_id || !sesi_id || !lokasi_pos_id) {
    throw new ApiError(400, 'peserta_id, sesi_id, and lokasi_pos_id are required');
  }
  if (req.user.id !== parseInt(peserta_id)) {
    throw new ApiError(403, 'Can only upload your own photo');
  }

  const { buffer, hash } = await processPhoto(req.file.buffer, req.file.mimetype);

  // Check duplicate
  const [dup] = await pool.execute(
    'SELECT id FROM submission_aktivitas WHERE foto_hash = ? AND peserta_id = ? LIMIT 1',
    [hash, peserta_id]
  );
  if (dup.length > 0) throw new ApiError(409, 'Duplicate photo detected');

  // Face detection (mock)
  const faceResult = await detectFace(buffer);

  // Save to DB (foto_url stores local path)
  const fileName = `sesi_${sesi_id}/peserta_${peserta_id}/${Date.now()}.jpg`;
  const fotoUrl = `/uploads/${fileName}`;

  const [result] = await pool.execute(
    `INSERT INTO submission_aktivitas (peserta_id, sesi_id, lokasi_pos_id, foto_url, foto_hash, caption, submission_lat, submission_lon, validasi_status, poin_diberikan)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'pending', 0)`,
    [peserta_id, sesi_id, lokasi_pos_id, fotoUrl, hash, caption || null]
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('photo_submitted', {
      submission_id: result.insertId,
      peserta_id: parseInt(peserta_id),
      sesi_id: parseInt(sesi_id),
      lokasi_pos_id: parseInt(lokasi_pos_id),
      foto_url: fotoUrl,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    data: {
      submission_id: result.insertId,
      status: 'pending',
      foto_url: fotoUrl,
      face_detected: faceResult.hasFace,
      face_confidence: faceResult.confidence,
      poin_granted: 0,
      message: 'Photo uploaded successfully. Awaiting validation.',
    },
  });
}));

/**
 * GET /api/photo/submission/:id
 */
router.get('/submission/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute(
    `SELECT sa.id, sa.peserta_id, sa.sesi_id, sa.lokasi_pos_id, sa.foto_url, sa.foto_hash,
            sa.caption, sa.submission_lat, sa.submission_lon, sa.validasi_status, sa.validasi_note,
            sa.poin_diberikan, sa.created_at, sa.updated_at, p.nama, p.email, lp.nama_pos
     FROM submission_aktivitas sa
     LEFT JOIN peserta p ON sa.peserta_id = p.id
     LEFT JOIN lokasi_pos lp ON sa.lokasi_pos_id = lp.id
     WHERE sa.id = ?`,
    [id]
  );
  if (rows.length === 0) throw new ApiError(404, 'Submission not found');

  const submission = rows[0];
  if (req.user.role === 'peserta' && req.user.id !== submission.peserta_id) {
    throw new ApiError(403, 'Can only view your own submissions');
  }
  res.json({ success: true, data: submission });
}));

/**
 * PUT /api/photo/submission/:id/validate
 */
router.put('/submission/:id/validate', authenticate, authorize('admin'), validate(validatePhotoSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { validasi_status, validasi_note, poin_adjustment } = req.body;

  const [current] = await pool.execute('SELECT * FROM submission_aktivitas WHERE id = ?', [id]);
  if (current.length === 0) throw new ApiError(404, 'Submission not found');

  let poin = current[0].poin_diberikan;
  if (poin_adjustment !== undefined) {
    poin = poin_adjustment;
  } else if (validasi_status === 'valid' && current[0].validasi_status !== 'valid') {
    poin = 5;
  } else if (validasi_status === 'rejected') {
    poin = 0;
  }

  await pool.execute(
    'UPDATE submission_aktivitas SET validasi_status = ?, validasi_note = ?, poin_diberikan = ?, updated_at = NOW() WHERE id = ?',
    [validasi_status, validasi_note || null, poin, id]
  );

  // Update progress
  if (validasi_status === 'valid') {
    await pool.execute(
      `INSERT INTO progress_peserta (peserta_id, sesi_id, lokasi_pos_id, status_completion, photo_submitted, completion_time)
       VALUES (?, ?, ?, 'photo_done', TRUE, NOW())
       ON DUPLICATE KEY UPDATE status_completion = 'photo_done', photo_submitted = TRUE, completion_time = NOW()`,
      [current[0].peserta_id, current[0].sesi_id, current[0].lokasi_pos_id]
    );
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('leaderboard_updated', {
      peserta_id: current[0].peserta_id,
      sesi_id: current[0].sesi_id,
      action: validasi_status === 'valid' ? 'photo_validated' : 'photo_rejected',
      poin,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    data: {
      submission_id: parseInt(id),
      validasi_status,
      poin_diberikan: poin,
      message: `Photo ${validasi_status === 'valid' ? 'approved' : 'rejected'} successfully`,
    },
  });
}));

/**
 * GET /api/photo/gallery/:sesi_id
 */
router.get('/gallery/:sesi_id', authenticate, asyncHandler(async (req, res) => {
  const { sesi_id } = req.params;
  let sql = `SELECT sa.id, sa.peserta_id, sa.sesi_id, sa.lokasi_pos_id, sa.foto_url, sa.caption,
                    sa.validasi_status, sa.poin_diberikan, sa.created_at, p.nama, lp.nama_pos
             FROM submission_aktivitas sa
             LEFT JOIN peserta p ON sa.peserta_id = p.id
             LEFT JOIN lokasi_pos lp ON sa.lokasi_pos_id = lp.id
             WHERE sa.sesi_id = ?
             ORDER BY sa.created_at DESC`;
  const params = [sesi_id];

  if (req.user.role === 'peserta') {
    sql += ' AND sa.peserta_id = ?';
    params.push(req.user.id);
  }

  const [rows] = await pool.execute(sql, params);
  res.json({ success: true, data: rows });
}));

module.exports = router;
