'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('./prisma');
const { STATIC_ADMIN } = require('../config/admin');

/** Ensure the static admin account exists with the configured password. */
async function ensureStaticAdmin() {
  const email = STATIC_ADMIN.email.toLowerCase();
  const passwordHash = bcrypt.hashSync(STATIC_ADMIN.password, 10);

  await prisma.user.upsert({
    where: { email },
    create: {
      name: STATIC_ADMIN.name,
      email,
      passwordHash,
      role: STATIC_ADMIN.role,
    },
    update: {
      name: STATIC_ADMIN.name,
      passwordHash,
      role: STATIC_ADMIN.role,
    },
  });
}

module.exports = { ensureStaticAdmin };
