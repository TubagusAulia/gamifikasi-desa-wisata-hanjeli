const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateLocationSchema, nearbyPosSchemaV2 } = require('../utils/schemas');
const { haversineDistance } = require('../utils/haversine');

const router = express.Router();

/**
 * POST /api/location/update - update peserta location (peserta)
 * Body: { peserta_id, lat, lon, accuracy }
 * - Upsert lokasi_peserta
 * - Check if inside any pos (haversine)
 * - Broadcast via socket.io
 */
router.post('/update', authenticate, authorize('peserta', 'worker'), validate(updateLocationSchema), asyncHandler(async (req, res) => {
  const { peserta_id, lat, lon, accuracy } = req.body;

  // Ensure peserta/worker only updates their own location
  if (req.user.id !== peserta_id) {
    throw new ApiError(403, 'Can only update your own location');
  }

  // Get all pos
  const [posRows] = await pool.execute(
    'SELECT id, nama, latitude, longitude, radius_meter FROM pos'
  );
  const posList = posRows.map(p => ({
    id: p.id,
    nama: p.nama,
    latitude: parseFloat(p.latitude),
    longitude: parseFloat(p.longitude),
    radius_meter: p.radius_meter,
  }));

  // Check if inside any pos using haversine
  let insidePosId = null;
  let insidePosNama = null;
  let insideDistance = null;

  for (const pos of posList) {
    const distance = haversineDistance(lat, lon, pos.latitude, pos.longitude);
    if (distance <= (pos.radius_meter || 50)) {
      insidePosId = pos.id;
      insidePosNama = pos.nama;
      insideDistance = Math.round(distance);
      break;
    }
  }

  // Get previous location
  const [prevRows] = await pool.execute(
    'SELECT id, inside_pos_id FROM lokasi_peserta WHERE peserta_id = ? LIMIT 1',
    [peserta_id]
  );
  const prevPosId = prevRows.length > 0 ? prevRows[0].inside_pos_id : null;

  let enterEvent = false;
  let exitEvent = false;
  if (insidePosId && insidePosId !== prevPosId) enterEvent = true;
  else if (!insidePosId && prevPosId) exitEvent = true;

  // Upsert lokasi_peserta
  await pool.execute(
    `INSERT INTO lokasi_peserta (peserta_id, latitude, longitude, accuracy_meter, inside_pos_id, last_updated)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude),
     accuracy_meter = VALUES(accuracy_meter), inside_pos_id = VALUES(inside_pos_id), last_updated = NOW()`,
    [peserta_id, lat, lon, accuracy || null, insidePosId]
  );

  // Broadcast via socket.io
  const io = req.app.get('io');
  if (io) {
    io.emit('location-update', {
      peserta_id,
      lat,
      lon,
      accuracy: accuracy || null,
      inside_pos_id: insidePosId,
      timestamp: new Date().toISOString(),
    });
    if (enterEvent) {
      io.emit('peserta_entered_pos', {
        peserta_id,
        pos_id: insidePosId,
        pos_nama: insidePosNama,
        timestamp: new Date().toISOString(),
      });
    }
    if (exitEvent) {
      io.emit('peserta_exited_pos', {
        peserta_id,
        pos_id: prevPosId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  res.json({
    success: true,
    data: {
      inside_pos: insidePosId !== null,
      pos_id: insidePosId,
      pos_nama: insidePosNama,
      distance_meters: insideDistance,
      message: insidePosNama ? `Inside pos: ${insidePosNama}` : 'Not inside any pos',
    },
  });
}));

/**
 * GET /api/location/nearby-pos - get nearby pos with distance
 * Query: { lat, lon }
 */
router.get('/nearby-pos', authenticate, validate(nearbyPosSchemaV2, 'query'), asyncHandler(async (req, res) => {
  const { lat, lon } = req.query;

  const [posRows] = await pool.execute(
    'SELECT id, nama, latitude, longitude, radius_meter, deskripsi FROM pos ORDER BY id'
  );

  const results = (posRows || []).map(pos => {
    const distance = haversineDistance(parseFloat(lat), parseFloat(lon), parseFloat(pos.latitude), parseFloat(pos.longitude));
    return {
      pos_id: pos.id,
      nama: pos.nama,
      latitude: parseFloat(pos.latitude),
      longitude: parseFloat(pos.longitude),
      radius_meter: pos.radius_meter,
      deskripsi: pos.deskripsi,
      distance_meters: Math.round(distance),
      inside_pos: distance <= (pos.radius_meter || 50),
    };
  }).sort((a, b) => a.distance_meters - b.distance_meters);

  res.json({ success: true, data: results });
}));

/**
 * GET /api/location/current-quiz - get the active quiz at the user's current POS
 * Returns the sesi (with quiz info, daftar_soal, and pos) for the pos the user is inside
 * Query: none (uses req.user.id to look up lokasi_peserta)
 */
router.get('/current-quiz', authenticate, authorize('peserta', 'worker'), asyncHandler(async (req, res) => {
  const pesertaId = req.user.id;

  // Get user's current location
  const [locRows] = await pool.execute(
    'SELECT inside_pos_id FROM lokasi_peserta WHERE peserta_id = ?',
    [pesertaId]
  );

  if (locRows.length === 0 || !locRows[0].inside_pos_id) {
    res.json({
      success: true,
      data: null,
      message: 'You are not inside any POS. Please go to a POS to access the quiz.',
    });
    return;
  }

  const posId = locRows[0].inside_pos_id;

  // Find the active sesi at this POS
  const [sesiRows] = await pool.execute(
    `SELECT s.id AS sesi_id, s.nama AS sesi_nama, s.tipe, s.password, s.waktu_mulai, s.waktu_selesai, s.status,
            s.daftar_soal_id, s.pos_id,
            q.id AS quiz_id, q.nama AS quiz_nama,
            ds.nama AS daftar_soal_nama,
            p.nama AS pos_nama, p.latitude, p.longitude, p.radius_meter
     FROM sesi s
     INNER JOIN quiz q ON s.quiz_id = q.id
     INNER JOIN daftar_soal ds ON s.daftar_soal_id = ds.id
     INNER JOIN pos p ON s.pos_id = p.id
     WHERE s.pos_id = ? AND s.status = 'active'
     ORDER BY s.waktu_mulai ASC
     LIMIT 1`,
    [posId]
  );

  if (sesiRows.length === 0) {
    res.json({
      success: true,
      data: null,
      message: 'No active quiz at this POS right now.',
    });
    return;
  }

  const sesi = sesiRows[0];

  if (req.user.role === 'worker') {
    const [assignRows] = await pool.execute(
      `SELECT qw.id FROM quiz_worker qw WHERE qw.peserta_id = ? AND qw.quiz_id = ? LIMIT 1`,
      [pesertaId, sesi.quiz_id]
    );
    if (assignRows.length === 0) {
      res.json({
        success: true,
        data: null,
        message: 'You are not assigned to this quiz.',
      });
      return;
    }
  }

  // Check if currently within time window
  const now = new Date();
  const mulai = new Date(String(sesi.waktu_mulai).replace(' ', 'T'));
  const selesai = new Date(String(sesi.waktu_selesai).replace(' ', 'T'));
  const isTimeValid = now >= mulai && now <= selesai;

  // Check if user already submitted
  let hasSubmitted = false;
  const [lbRows] = await pool.execute('SELECT leaderboard FROM sesi WHERE id = ?', [sesi.sesi_id]);
  const lb = lbRows[0]?.leaderboard ? JSON.parse(lbRows[0].leaderboard) : {};
  if (sesi.tipe === 'individu') {
    hasSubmitted = !!lb[pesertaId];
  } else {
    hasSubmitted = !!lb[req.user.kelompok_id];
  }

  res.json({
    success: true,
    data: {
      sesi_id: sesi.sesi_id,
      sesi_nama: sesi.sesi_nama,
      tipe: sesi.tipe,
        status: sesi.status,      password: sesi.password,
      waktu_mulai: sesi.waktu_mulai,
      waktu_selesai: sesi.waktu_selesai,
      is_time_valid: isTimeValid,
      has_submitted: hasSubmitted,
      quiz_id: sesi.quiz_id,      quiz_nama: sesi.quiz_nama,
      daftar_soal_id: sesi.daftar_soal_id,
      daftar_soal_nama: sesi.daftar_soal_nama,
      pos_id: sesi.pos_id,
      pos_nama: sesi.pos_nama,
      latitude: parseFloat(sesi.latitude),
      longitude: parseFloat(sesi.longitude),
      radius_meter: sesi.radius_meter,
    },
  });
}));

/**
 * GET /api/location/peserta/:peserta_id - get peserta's current location (admin, worker)
 */
router.get('/peserta/:peserta_id', authenticate, authorize('admin', 'worker'), asyncHandler(async (req, res) => {
  const { peserta_id } = req.params;

  const [rows] = await pool.execute(
    `SELECT lp.id, lp.peserta_id, lp.latitude, lp.longitude, lp.accuracy_meter,
            lp.inside_pos_id, lp.last_updated,
            p.nama, p.email,
            pos.nama AS pos_nama
     FROM lokasi_peserta lp
     LEFT JOIN peserta p ON lp.peserta_id = p.id
     LEFT JOIN pos pos ON lp.inside_pos_id = pos.id
     WHERE lp.peserta_id = ?`,
    [peserta_id]
  );

  if (rows.length === 0) {
    res.json({
      success: true,
      data: null,
      message: 'No location data for this peserta',
    });
    return;
  }

  const location = rows[0];
  res.json({
    success: true,
    data: {
      ...location,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
    },
  });
}));

module.exports = router;
