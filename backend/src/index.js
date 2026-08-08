'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes       = require('./routes/auth');
const courseRoutes     = require('./routes/courses');
const attendanceRoutes = require('./routes/attendance');
const assignmentRoutes = require('./routes/assignments');
const resultRoutes     = require('./routes/results');
const userRoutes       = require('./routes/users');
const { ensureStaticAdmin } = require('./utils/ensureAdmin');
const { STATIC_ADMIN } = require('./config/admin');

const app  = express();
const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/courses',     courseRoutes);
app.use('/api/v1/attendance',  attendanceRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/results',     resultRoutes);
app.use('/api/v1/users',       userRoutes);

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Something went wrong.' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function start() {
  try {
    await ensureStaticAdmin();
  } catch (err) {
    console.error('Failed to ensure static admin:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🎓 Jadeja University API  →  http://localhost:${PORT}/api/v1`);
    console.log(`   Health check           →  http://localhost:${PORT}/api/v1/health`);
    console.log(`   Admin login            →  ${STATIC_ADMIN.email} / ${STATIC_ADMIN.password}\n`);
  });
}

start();
