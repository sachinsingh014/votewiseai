'use strict';

const apiResponse = require('../utils/apiResponse');

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile from the decoded token.
 */
const getMe = (req, res) =>
  apiResponse.success(res, {
    uid: req.user.uid,
    email: req.user.email,
    emailVerified: req.user.email_verified,
  });

module.exports = { getMe };
