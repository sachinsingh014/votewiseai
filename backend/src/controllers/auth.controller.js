'use strict';

/**
 * @fileoverview Authentication controller for VoteWise AI backend.
 * @module controllers/auth
 * @requires utils/apiResponse
 *
 * Exposes one endpoint: GET /api/auth/me
 * Relies entirely on the `authenticate` middleware to verify the token —
 * this controller only formats and returns the already-decoded payload.
 */

const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile from their decoded Firebase ID token.
 * Does NOT make any Firestore or external API calls — pure token reflection.
 *
 * SECURITY: The `authenticate` middleware runs before this controller and verifies
 * the Firebase ID token. This controller only runs if the token is valid.
 *
 * @param {import('express').Request} req - Express request (requires req.user from authenticate middleware)
 * @param {string} req.user.uid - Firebase UID from decoded token
 * @param {string} req.user.email - Email address from decoded token
 * @param {boolean} req.user.email_verified - Whether the email address is verified
 * @param {import('express').Response} res - Express response object
 * @returns {import('express').Response} JSON with uid, email, and emailVerified fields
 *
 * @example
 * // GET /api/auth/me  (with valid Authorization: Bearer <token>)
 * // Response: { "success": true, "data": { "uid": "abc", "email": "user@example.com", "emailVerified": true } }
 */
const getMe = (req, res) =>
  apiResponse.success(res, {
    uid: req.user.uid,
    email: req.user.email,
    emailVerified: req.user.email_verified,
  });

module.exports = { getMe };
