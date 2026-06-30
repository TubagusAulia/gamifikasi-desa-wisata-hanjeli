const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateLocationSchema, nearbyPosSchemaV2 } = require('../utils/schemas');
const { haversineDistance } = require('../utils/haversine');

const router = express.Router();

let insidePosId = null;
let insidePosNama = null;
let insideDistance = null;

async function findInsidePos(lat, lon) {
  const [posRows] = await pool.execute('SELECT id, nama, latitude, longitude, radius_meter FROM pos');
  for (const p of posRows) {
    const pos = { id: p.id, nama: p.nama, latitude: parseFloat(p.latitude), longitude: parseFloat(p.longitude), radius_meter: p.radius_meter };
    const distance = haversineDistance(lat, lon, pos.latitude, pos.longitude);
    if (distance <= (pos.radius_meter || 50)) {
      return { id: pos.id, nama: pos.nama, distance: Math.round(distance) };
    }
  }
  return null;
}

async function getPrevPosId(peserta_id) {
  const [prevRows] = await pool.execute('SELECT inside_pos_id FROM lokasi_peserta WHERE peserta_id = ? LIMIT 1', [peserta_id]);
  return prevRows.length > 0 ? prevRows[0].inside_pos_id : null;
}

function broadcastLocation(io, data) {
  io.emit('location-update', { ...data, timestamp: new Date().toISOString() });
}

function broadcastEnterEvent(io, data) {
  io.emit('peserta_entered_pos', { ...data, timestamp: new Date().toISOString() });
}

function broadcastExitEvent(io, data) {
  io.emit('peserta_exited_pos', { ...data, timestamp: new Date().toISOString() });
}

/**
 * POST /api/location/update - update peserta location (peserta)
 * Body: { peserta_id, lat, lon, accuracy }
 * - Upsert lokasi_peserta
 * - Check if inside any pos (haversine)
 * - Broadcast via socket.io
 */
router.post('/update', authenticate, authorize('peserta', 'worker'), validate(updateLocationSchema), asyncHandler(async (req, res) => {
  const { peserta_id, lat, lon, accuracy } = req.body;

  if (req.user.id !== peserta_id) {
    throw new ApiError(403, 'Can only update your own location');
  }

  const inside = await findInsidePos(lat, lon);
  insidePosId = inside?.id ?? null;
  insidePosNama = inside?.nama ?? null;
  insideDistance = inside?.distance ?? null;

  const prevPosId = await getPrevPosId(peserta_id);
  const enterEvent = insidePosId && insidePosId !== prevPosId;
  const exitEvent = !insidePosId && prevPosId;

  await pool.execute(
    `INSERT INTO lokasi_peserta (peserta_id, latitude, longitude, accuracy_meter, inside_pos_id, last_updated)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude),
     accuracy_meter = VALUES(accuracy_meter), inside_pos_id = VALUES(inside_pos_id), last_updated = NOW()`,
    [peserta_id, lat, lon, accuracy || null, insidePosId]
  );

  const io = req.app.get('io');
  if (io) {
    broadcastLocation(io, { peserta_id, lat, lon, accuracy: accuracy || null, inside_pos_id: insidePosId });
    if (enterEvent) broadcastEnterEvent(io, { peserta_id, pos_id: insidePosId, pos_nama: insidePosNama });
    if (exitEvent) broadcastExitEvent(io, { peserta_id, pos_id: prevPosId });
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
 * Returns the quiz (with quiz info, daftar_soal, and pos) for the pos the user is inside
 * Query: none (uses req.user.id to look up lokasi_peserta)
 */
async function findActiveQuizAtPos(posId) {
  const [quizRows] = await pool.execute(
    `SELECT q.id AS quiz_id, q.nama AS quiz_nama, q.tipe, q.password, q.waktu_mulai, q.waktu_selesai, q.status,
            q.daftar_soal_id, q.pos_id,
            a.id AS agenda_id, a.nama AS agenda_nama,
            ds.nama AS daftar_soal_nama,
            p.nama AS pos_nama, p.latitude, p.longitude, p.radius_meter
     FROM quiz q
     INNER JOIN agenda a ON q.agenda_id = a.id
     INNER JOIN daftar_soal ds ON q.daftar_soal_id = ds.id
     INNER JOIN pos p ON q.pos_id = p.id
     WHERE q.pos_id = ? AND (q.status = 'active' OR (q.waktu_mulai <= NOW() AND q.waktu_selesai >= NOW()))
     ORDER BY q.waktu_mulai ASC
     LIMIT 1`,
    [posId]
  );
  return quizRows[0] || null;
}

async function isWorkerAssignedToQuiz(pesertaId, agendaId) {
  const [assignRows] = await pool.execute(
    `SELECT qw.id FROM agenda_worker qw WHERE qw.peserta_id = ? AND qw.agenda_id = ? LIMIT 1`,
    [pesertaId, agendaId]
  );
  return assignRows.length > 0;
}

function checkHasSubmitted(quiz) {
  return (quiz.tipe === 'individu')
    ? !!lbCache.get(quiz.quiz_id)?.pesertaId
    : !!lbCache.get(quiz.quiz_id)?.kelompokId;
}

// Simple in-memory cache for leaderboard lookups within a single request
const lbCache = new Map();

router.get('/current-quiz', authenticate, authorize('peserta', 'worker'), asyncHandler(async (req, res) => {
  const pesertaId = req.user.id;

  const [locRows] = await pool.execute(
    'SELECT inside_pos_id FROM lokasi_peserta WHERE peserta_id = ?',
    [pesertaId]
  );

  if (locRows.length === 0 || !locRows[0].inside_pos_id) {
    res.json({ success: true, data: null, message: 'You are not inside any POS. Please go to a POS to access the quiz.' });
    return;
  }

  const quiz = await findActiveQuizAtPos(locRows[0].inside_pos_id);
  if (!quiz) {
    res.json({ success: true, data: null, message: 'No active quiz at this POS right now.' });
    return;
  }

  if (req.user.role === 'worker' && !await isWorkerAssignedToQuiz(pesertaId, quiz.agenda_id)) {
    res.json({ success: true, data: null, message: 'You are not assigned to this quiz.' });
    return;
  }

  const now = new Date();
  const mulai = new Date(String(quiz.waktu_mulai).replace(' ', 'T'));
  const selesai = new Date(String(quiz.waktu_selesai).replace(' ', 'T'));
  const isTimeValid = now >= mulai && now <= selesai;

  const [lbRows] = await pool.execute('SELECT leaderboard FROM quiz WHERE id = ?', [quiz.quiz_id]);
  const lb = lbRows[0]?.leaderboard ? JSON.parse(lbRows[0].leaderboard) : {};
  lbCache.set(quiz.quiz_id, { pesertaId: lb[pesertaId], kelompokId: lb[req.user.kelompok_id] });
  const hasSubmitted = checkHasSubmitted(quiz);

  res.json({
    success: true,
    data: {
      quiz_id: quiz.quiz_id,
      quiz_nama: quiz.quiz_nama,
      tipe: quiz.tipe,
      status: quiz.status,
      password: quiz.password,
      waktu_mulai: quiz.waktu_mulai,
      waktu_selesai: quiz.waktu_selesai,
      is_time_valid: isTimeValid,
      has_submitted: hasSubmitted,
      agenda_id: quiz.agenda_id,
      agenda_nama: quiz.agenda_nama,
      daftar_soal_id: quiz.daftar_soal_id,
      daftar_soal_nama: quiz.daftar_soal_nama,
      pos_id: quiz.pos_id,
      pos_nama: quiz.pos_nama,
      latitude: parseFloat(quiz.latitude),
      longitude: parseFloat(quiz.longitude),
      radius_meter: quiz.radius_meter,
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
