'use strict';

/**
 * @fileoverview Standardized API response utility for VoteWise AI backend.
 * @module utils/apiResponse
 *
 * Ensures every endpoint returns a consistent JSON envelope:
 * - Success: `{ success: true, data: {...}, meta?: {...} }`
 * - Error:   `{ success: false, error: { message: "...", details?: {...} } }`
 *
 * Controllers should use these helpers instead of calling res.status().json() directly.
 */

/**
 * Sends a successful JSON response with standardized envelope.
 *
 * @param {import('express').Response} res - Express response object
 * @param {*} data - Response payload to include under the `data` key
 * @param {number} [statusCode=200] - HTTP status code (200, 201, etc.)
 * @param {Object|null} [meta=null] - Optional pagination or metadata object
 * @returns {import('express').Response} The Express response object (for chaining)
 *
 * @example
 * apiResponse.success(res, { user: { id: '123', name: 'Alice' } });
 * // Response: { "success": true, "data": { "user": { ... } } }
 */
const success = (res, data, statusCode = 200, meta = null) => {
  const body = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
};

/**
 * Sends a 201 Created response — shorthand for success with HTTP 201.
 *
 * @param {import('express').Response} res - Express response object
 * @param {*} data - The newly created resource data
 * @returns {import('express').Response} The Express response object
 */
const created = (res, data) => success(res, data, 201);

/**
 * Sends an error JSON response with standardized envelope.
 * In non-production environments, includes optional debug details.
 *
 * SECURITY: The `details` field is suppressed in production to prevent internal
 * information leakage (stack traces, query details, etc.).
 *
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Human-readable error description
 * @param {number} [statusCode=500] - HTTP error status code
 * @param {*} [details=null] - Optional debug details (suppressed in production)
 * @returns {import('express').Response} The Express response object
 */
const error = (res, message, statusCode = 500, details = null) => {
  const body = { success: false, error: { message } };
  if (details && process.env.NODE_ENV !== 'production') {
    body.error.details = details;
  }
  return res.status(statusCode).json(body);
};

/**
 * Sends a 400 Bad Request response.
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Validation or input error description
 * @param {*} [details=null] - Optional field-level validation details
 * @returns {import('express').Response} The Express response object
 */
const badRequest = (res, message, details = null) => error(res, message, 400, details);

/**
 * Sends a 401 Unauthorized response.
 * @param {import('express').Response} res - Express response object
 * @param {string} [message='Unauthorized'] - Authentication failure reason
 * @returns {import('express').Response} The Express response object
 */
const unauthorized = (res, message = 'Unauthorized') => error(res, message, 401);

/**
 * Sends a 403 Forbidden response.
 * @param {import('express').Response} res - Express response object
 * @param {string} [message='Forbidden'] - Authorization failure reason
 * @returns {import('express').Response} The Express response object
 */
const forbidden = (res, message = 'Forbidden') => error(res, message, 403);

/**
 * Sends a 404 Not Found response.
 * @param {import('express').Response} res - Express response object
 * @param {string} [message='Resource not found'] - Description of what was not found
 * @returns {import('express').Response} The Express response object
 */
const notFound = (res, message = 'Resource not found') => error(res, message, 404);

/**
 * Sends a 429 Too Many Requests response.
 * @param {import('express').Response} res - Express response object
 * @param {string} [message='Too many requests'] - Rate limit exceeded description
 * @returns {import('express').Response} The Express response object
 */
const tooManyRequests = (res, message = 'Too many requests') => error(res, message, 429);

module.exports = { success, created, error, badRequest, unauthorized, forbidden, notFound, tooManyRequests };
