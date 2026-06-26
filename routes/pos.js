const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPosSchema, updatePosSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * GET /api/pos - list all pos (public)
 */
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, nama, latitude, longitude, radius_meter, deskripsi, created_at FROM pos ORDER BY id'
  );
  const data = rows.map(r => ({
    ...r,
    latitude: parseFloat(r.latitude),
    longitude: parseFloat(r.longitude),
  }));
  res.json({ success: true, data });
}));

/**
 * POST /api/pos - create pos (admin only)
 * Body: { nama, latitude, longitude, radius_meter, deskripsi }
 */
router.post('/', authenticate, authorize('admin'), validate(createPosSchema), asyncHandler(async (req, res) => {
  const { nama, latitude, longitude, radius_meter, deskripsi } = req.body;

  const [result] = await pool.execute(
    'INSERT INTO pos (nama, latitude, longitude, radius_meter, deskripsi) VALUES (?, ?, ?, ?, ?)',
    [nama, latitude, longitude, radius_meter || 50, deskripsi || null]
  );

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      nama,
      latitude,
      longitude,
      radius_meter: radius_meter || 50,
      deskripsi: deskripsi || null,
    },
  });
}));

/**
 * GET /api/pos/:id - pos detail
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.execute(
    'SELECT id, nama, latitude, longitude, radius_meter, deskripsi, created_at FROM pos WHERE id = ?',
    [id]
  );
  if (rows.length === 0) throw new ApiError(404, 'Pos not found');

  const pos = rows[0];
  res.json({
    success: true,
    data: {
      ...pos,
      latitude: parseFloat(pos.latitude),
      longitude: parseFloat(pos.longitude),
    },
  });
}));

/**
 * PUT /api/pos/:id - update pos (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), validate(updatePosSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const [existing] = await pool.execute('SELECT id FROM pos WHERE id = ?', [id]);
  if (existing.length === 0) throw new ApiError(404, 'Pos not found');

  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) throw new ApiError(400, 'No fields to update');

  values.push(id);
  await pool.execute(`UPDATE pos SET ${fields.join(', ')} WHERE id = ?`, values);

  const [rows] = await pool.execute('SELECT * FROM pos WHERE id = ?', [id]);
  const pos = rows[0];
  res.json({
    success: true,
    data: {
      ...pos,
      latitude: parseFloat(pos.latitude),
      longitude: parseFloat(pos.longitude),
    },
    message: 'Pos updated successfully',
  });
}));

/**
 * DELETE /api/pos/:id - delete pos (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await pool.execute('DELETE FROM pos WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Pos not found');

  res.json({ success: true, message: 'Pos deleted successfully' });
}));

module.exports = router;
