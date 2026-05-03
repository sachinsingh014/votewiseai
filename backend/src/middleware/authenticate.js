'use strict';

/**
 * @fileoverview Firebase Auth middleware — verifies Firebase ID tokens on protected routes.
 * @module middleware/authenticate
 * @requires firebase-admin
 * @requires utils/apiResponse
 * @requires utils/logger
 */

const admin = require('firebase-admin');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Express middleware that verifies a Firebase ID token from the Authorization header.
 * Attaches the decoded token payload to `req.user` so downstream controllers can
 * access the authenticated user's uid, email, and custom claims.
 *
 * SECURITY:
 *   - Tokens must be signed by Google's Firebase Auth service.
 *   - Expired tokens are rejected automatically by the Firebase Admin SDK.
 *   - Rate limiting is applied at the route level upstream of this middleware.
 *   - The raw token is never stored or logged.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Calls next() on success; returns 401 JSON on failure
 *
 * @example
 * // Usage in a route file:
 * const authenticate = require('../middleware/authenticate');
 * router.get('/protected', authenticate, myController);
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiResponse.unauthorized(res, 'Missing or invalid Authorization header.');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    logger.warn({ message: 'Token verification failed', error: err.message });
    return apiResponse.unauthorized(res, 'Invalid or expired token.');
  }
};

module.exports = authenticate;
