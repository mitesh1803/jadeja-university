'use strict';

/** Fixed system admin — always available; not creatable via the Users API. */
const STATIC_ADMIN = Object.freeze({
  name: 'System Admin',
  email: 'admin@jadeja.edu',
  password: 'Admin@123',
  role: 'admin',
});

module.exports = { STATIC_ADMIN };
