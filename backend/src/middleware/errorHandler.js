'use strict';

/**
 * @fileoverview Global error handling middleware for the VoteWise AI backend.
 * @module middleware/errorHandler
 * @requires utils/logger
 * @requires utils/apiResponse
 *
 * Provides two Express middleware functions:
 *  - `errorHandler`: catches all errors passed via next(err) — must be last in the chain
 *  - `notFoundHandler`: returns 404 for any route not matched by the router
 */

const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');

/**
 * Global error-handling middleware.
 * Catches all errors passed via `next(err)` from any route handler or controller.
 * Returns a standardized JSON error response using the apiResponse utility.
 *
 * SECURITY: Stack traces and internal details are only included in development
 * environments. Production responses contain only the status code and message.
 *
 * @param {Error} err - The error object passed from upstream middleware or controllers
 * @param {import('express').Request} _req - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} _next - Express next function (unused, required by signature)
 * @returns {import('express').Response} Standardized JSON error response
 */
const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    message,
    statusCode,
    stack: err.stack,
  });

  return apiResponse.error(res, message, statusCode, err.details);
};

/**
 * 404 Not Found handler for all routes that don't match any defined endpoint.
 * Must be registered after all route definitions but before the error handler.
 *
 * @param {import('express').Request} _req - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @returns {import('express').Response} Standardized 404 JSON response
 */
const notFoundHandler = (_req, res) =>
  apiResponse.notFound(res, 'The requested endpoint does not exist.');

module.exports = { errorHandler, notFoundHandler };
