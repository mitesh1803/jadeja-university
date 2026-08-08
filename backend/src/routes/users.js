const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { STATIC_ADMIN } = require('../config/admin');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin')); // Only admins can manage users

const ALLOWED_ROLES = ['student', 'faculty'];

// GET /users — list all users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// POST /users — admin creates a student or faculty (teacher) account
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Admin can only add student or faculty.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (normalizedEmail === STATIC_ADMIN.email.toLowerCase()) {
      return res.status(400).json({ error: 'That email is reserved for the system admin.' });
    }

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash: bcrypt.hashSync(password, 10),
        role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }
    next(err);
  }
});

module.exports = router;
