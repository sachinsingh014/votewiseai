'use strict';

const { Router } = require('express');
const { getMe } = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();

/**
 * GET /api/auth/me
 * Returns authenticated user profile. Requires valid Firebase token.
 */
router.get('/me', authenticate, getMe);

module.exports = router;
