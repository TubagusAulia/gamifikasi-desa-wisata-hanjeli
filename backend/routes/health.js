const express = require('express');
const pool = require('../config/database');

const router = express.Router();

/**
 * GET /api/health - check DB connection status
 */
router.get('/', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({
      success: true,
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      success: false,
      status: 'degraded',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
