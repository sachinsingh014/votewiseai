'use strict';

const admin = require('firebase-admin');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Verifies Firebase ID token from the Authorization header.
 * Attaches decoded user payload to req.user on success.
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
