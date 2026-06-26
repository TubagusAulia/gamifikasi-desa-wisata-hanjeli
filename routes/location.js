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
router.post('/update', authenticate, authorize('peserta'), validate(updateLocationSchema), asyncHandler(async (req, res) => {
  const { peserta_id, lat, lon, accuracy } = req.body;

  // Ensure peserta only updates their own location
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
