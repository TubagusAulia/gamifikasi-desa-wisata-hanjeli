const express = require('express');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/workers - list all users with role 'worker' (admin only)
 */
router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute("SELECT id, nama, email, role FROM peserta WHERE role = 'worker' ORDER BY id");
  const data = rows.map(r => ({ id: r.id, nama: r.nama, email: r.email, userclass: r.role || 'worker' }));
  res.json({ success: true, data });
}));

module.exports = router;
