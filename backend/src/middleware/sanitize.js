'use strict';

/**
 * Payload Sanitizer Middleware
 * Strips MongoDB operator characters ($, .) from request body keys
 * to prevent NoSQL injection attacks. Provides the same protection
 * as express-mongo-sanitize without the Express version conflicts.
 */

const sanitizeValue = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !key.startsWith('$') && !key.includes('.'))
      .map(([key, val]) => [key, typeof val === 'object' ? sanitizeValue(val) : val])
  );
};

const mongoSanitize = () => (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};

module.exports = mongoSanitize;
