require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/location');
const photoRoutes = require('./routes/photo');
const mapRoutes = require('./routes/map');
const progressRoutes = require('./routes/progress');
const quizRoutes = require('./routes/quiz');
const workersRoutes = require('./routes/workers');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const kelompokRoutes = require('./routes/kelompok');
const sesiRoutes = require('./routes/sesi');
const daftarSoalRoutes = require('./routes/daftarSoal');
const posRoutes = require('./routes/pos');
const reviewRoutes = require('./routes/review');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to routes
app.set('io', io);

// --- Middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/photo', photoRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/kelompok', kelompokRoutes);
app.use('/api/sesi', sesiRoutes);
app.use('/api/daftar-soal', daftarSoalRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/review', reviewRoutes);

// --- Error handling ---
app.use(notFoundHandler);
app.use(errorHandler);

// --- Socket.io connection handling ---
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join room for session tracking
  socket.on('join-session', (sesi_id) => {
    socket.join(`session-${sesi_id}`);
    console.log(`[Socket.io] ${socket.id} joined session-${sesi_id}`);
  });

  // Join room for admin dashboard
  socket.join('admin-dashboard');

  // Handle location updates from peserta
  socket.on('location-update', (data) => {
    // Broadcast to admin dashboard
    io.to('admin-dashboard').emit('location-update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('============================================');
  console.log(`  Gamifikasi DWH Backend Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API Health: http://localhost:${PORT}/api/health`);
  console.log('============================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server, io };
