const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../utils/schemas');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

/**
 * GET /api/auth/me - get current user info from token
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.user;

  const [rows] = await pool.execute(
    'SELECT id, nama, email, role, kelompok_id, created_at FROM peserta WHERE id = ? LIMIT 1',
    [id]
  );

  if (rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: rows[0],
  });
}));

/**
 * POST /api/auth/login
 */
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.execute(
    'SELECT id, nama, email, password_hash, role, kelompok_id FROM peserta WHERE email = ? LIMIT 1',
    [email]
  );

  if (rows.length === 0) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, nama: user.nama, role: user.role || 'peserta', kelompok_id: user.kelompok_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, nama: user.nama, email: user.email, role: user.role || 'peserta', kelompok_id: user.kelompok_id },
    },
  });
}));

/**
 * POST /api/auth/register
 */
router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { nama, email, password, role, kelompok_id } = req.body;

  const [existing] = await pool.execute('SELECT id FROM peserta WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    throw new ApiError(409, 'Email already registered');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    'INSERT INTO peserta (nama, email, password_hash, role, kelompok_id) VALUES (?, ?, ?, ?, ?)',
    [nama, email, password_hash, role || 'peserta', kelompok_id || null]
  );

  const token = jwt.sign(
    { id: result.insertId, email, nama, role: role || 'peserta', kelompok_id: kelompok_id || null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id: result.insertId, nama, email, role: role || 'peserta', kelompok_id: kelompok_id || null },
    },
  });
}));

module.exports = router;
