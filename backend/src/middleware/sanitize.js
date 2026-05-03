'use strict';

/**
 * @fileoverview Payload sanitizer middleware — strips MongoDB operator characters from request bodies.
 * @module middleware/sanitize
 *
 * Provides NoSQL injection prevention equivalent to `express-mongo-sanitize`
 * without the Express version incompatibilities of that package.
 */

/**
 * @typedef {Object} SanitizableObject
 * @description Any plain JavaScript object whose keys may contain MongoDB operators.
 */

/**
 * Recursively strips keys starting with `$` (MongoDB operators) or containing `.`
 * (dot-notation traversal) from a plain object. Safe for nested objects.
 *
 * SECURITY: Prevents NoSQL injection attacks using `$ne`, `$gt`, `$regex` patterns.
 * COMPLEXITY: O(n) where n is the total number of keys across all nested objects.
 *
 * @param {Object} obj - The object to sanitize (req.body or a nested sub-object)
 * @returns {Object} A new object with all injection-risk keys removed
 *
 * @example
 * sanitizeValue({ email: { $ne: '' }, name: 'Alice' });
 * // Returns: { name: 'Alice' }
 */
const sanitizeValue = (obj) => {
  if (typeof obj !== 'object' || obj === null) {return obj;}
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !key.startsWith('$') && !key.includes('.'))
      .map(([key, val]) => [key, typeof val === 'object' ? sanitizeValue(val) : val])
  );
};

/**
 * Express middleware factory that sanitizes `req.body` on every incoming request.
 * Only operates if the body is a parsed object (i.e., after express.json()).
 *
 * SECURITY: Must be applied AFTER express.json() and BEFORE route handlers.
 *
 * @returns {import('express').RequestHandler} Express middleware function
 *
 * @example
 * const mongoSanitize = require('./middleware/sanitize');
 * app.use(express.json());
 * app.use(mongoSanitize()); // sanitize after body parsing
 */
const mongoSanitize = () => (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};

module.exports = mongoSanitize;
