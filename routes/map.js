const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPosSchema, updatePosSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * POST /api/map/pos/create
 */
router.post('/pos/create', authenticate, authorize('admin'), validate(createPosSchema), asyncHandler(async (req, res) => {
  const { sesi_id, nama_pos, latitude, longitude, radius_meter, deskripsi } = req.body;

  const [sesiRows] = await pool.execute('SELECT id FROM sesi WHERE id = ?', [sesi_id]);
  if (sesiRows.length === 0) throw new ApiError(404, 'Session not found');

  const [result] = await pool.execute(
    'INSERT INTO lokasi_pos (sesi_id, nama_pos, latitude, longitude, radius_meter, deskripsi) VALUES (?, ?, ?, ?, ?, ?)',
    [sesi_id, nama_pos, latitude, longitude, radius_meter || 50, deskripsi || null]
  );

  res.status(201).json({
    success: true,
    data: {
      pos_id: result.insertId,
      sesi_id: parseInt(sesi_id),
      nama_pos,
      latitude,
      longitude,
      radius_meter: radius_meter || 50,
      geofence_id: `geofence_${result.insertId}`,
      message: 'Pos created successfully',
    },
  });
}));

/**
 * GET /api/map/pos/:sesi_id
 */
router.get('/pos/:sesi_id', asyncHandler(async (req, res) => {
  const { sesi_id } = req.params;
  const [rows] = await pool.execute(
    'SELECT id, nama_pos, latitude, longitude, radius_meter, deskripsi FROM lokasi_pos WHERE sesi_id = ? ORDER BY id',
    [sesi_id]
  );
  const data = rows.map(r => ({ ...r, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude) }));
  res.json({ success: true, data });
}));

/**
 * PUT /api/map/pos/:pos_id
 */
router.put('/pos/:pos_id', authenticate, authorize('admin'), validate(updatePosSchema), asyncHandler(async (req, res) => {
  const { pos_id } = req.params;
  const updates = req.body;

  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  if (fields.length === 0) throw new ApiError(400, 'No fields to update');

  values.push(pos_id);
  const [result] = await pool.execute(
    `UPDATE lokasi_pos SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  if (result.affectedRows === 0) throw new ApiError(404, 'Pos not found');

  const [rows] = await pool.execute('SELECT * FROM lokasi_pos WHERE id = ?', [pos_id]);
  res.json({ success: true, data: rows[0], message: 'Pos updated successfully' });
}));

/**
 * DELETE /api/map/pos/:pos_id
 */
router.delete('/pos/:pos_id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { pos_id } = req.params;
  const [result] = await pool.execute('DELETE FROM lokasi_pos WHERE id = ?', [pos_id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Pos not found');
  res.json({ success: true, message: 'Pos deleted successfully' });
}));

module.exports = router;
