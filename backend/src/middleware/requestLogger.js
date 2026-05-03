'use strict';

/**
 * @fileoverview HTTP request logging middleware for VoteWise AI backend.
 * @module middleware/requestLogger
 * @requires utils/logger
 *
 * Attaches a `finish` event listener to each response to log structured
 * request metadata after the response is flushed. Uses the Winston logger
 * for structured JSON output compatible with Google Cloud Logging.
 */

const logger = require('../utils/logger');

/**
 * Express middleware that logs structured metadata for every HTTP request.
 * Captures: HTTP method, URL, status code, response time, and client IP.
 *
 * PERFORMANCE: Uses the `res.finish` event so logging occurs after the response
 * is sent — no blocking of the request pipeline.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void} Calls next() immediately; logging happens asynchronously on finish
 *
 * @example
 * // Logged output sample:
 * // { "type": "request", "method": "GET", "url": "/api/health/liveness",
 * //   "status": 200, "duration": "12ms", "ip": "::1" }
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      type: 'request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};

module.exports = requestLogger;
