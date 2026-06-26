const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gamifikasi_dwh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log(`[MySQL] Connected to ${process.env.DB_NAME || 'gamifikasi_dwh'} @ ${process.env.DB_HOST || 'localhost'}`);
    conn.release();
  })
  .catch(err => {
    console.error('[MySQL] Connection failed:', err.message);
    console.error('[MySQL] Make sure XAMPP MySQL is running and database is created.');
  });

module.exports = pool;
