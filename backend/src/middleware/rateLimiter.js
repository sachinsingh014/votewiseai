'use strict';

/**
 * @fileoverview Rate limiter middleware factories for VoteWise AI backend.
 * @module middleware/rateLimiter
 * @requires express-rate-limit
 * @requires utils/apiResponse
 *
 * Provides two tiered limiters:
 *  - `generalLimiter`: baseline protection for all routes
 *  - `aiLimiter`: strict protection for Gemini/AI endpoints to control API costs
 */

const rateLimit = require('express-rate-limit');
const apiResponse = require('../utils/apiResponse');

/**
 * Internal factory — creates a configured express-rate-limit instance.
 *
 * SECURITY: Returns RFC 7807-compliant JSON via our standard apiResponse.tooManyRequests
 * handler instead of the default plain-text response, ensuring consistent error shapes.
 *
 * @param {number} windowMs - Time window in milliseconds for the rate limit
 * @param {number} max - Maximum number of requests allowed within the window
 * @param {string} message - Human-readable error message shown when limit is exceeded
 * @returns {import('express-rate-limit').RateLimitRequestHandler} Configured rate limiter middleware
 */
const buildLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => apiResponse.tooManyRequests(res, message),
  });

/**
 * General API rate limiter — applies a baseline request ceiling to all routes.
 * Limits are read from environment config to allow per-deployment tuning.
 *
 * SECURITY: Applied globally in server.js before any route handlers.
 * DEFAULT: 100 requests per 15-minute window per IP.
 *
 * @param {Object} env - Validated environment configuration object
 * @param {number} env.RATE_LIMIT_WINDOW_MS - Time window in milliseconds
 * @param {number} env.RATE_LIMIT_MAX - Max requests per window
 * @returns {import('express-rate-limit').RateLimitRequestHandler} Rate limiter middleware
 */
const generalLimiter = (env) =>
  buildLimiter(
    env.RATE_LIMIT_WINDOW_MS,
    env.RATE_LIMIT_MAX,
    'Too many requests. Please try again later.'
  );

/**
 * Strict AI rate limiter — applies a tighter ceiling specifically to Gemini/AI endpoints.
 * Prevents API cost abuse and ensures fair usage across all users.
 *
 * SECURITY: Applied only to /api/ai and /api/journey route groups.
 * PERFORMANCE: Limits are separate from the general limiter to avoid blocking non-AI traffic.
 * DEFAULT: 20 requests per minute per IP.
 *
 * @param {Object} env - Validated environment configuration object
 * @param {number} env.AI_RATE_LIMIT_WINDOW_MS - AI time window in milliseconds
 * @param {number} env.AI_RATE_LIMIT_MAX - Max AI requests per window
 * @returns {import('express-rate-limit').RateLimitRequestHandler} Rate limiter middleware
 */
const aiLimiter = (env) =>
  buildLimiter(
    env.AI_RATE_LIMIT_WINDOW_MS,
    env.AI_RATE_LIMIT_MAX,
    'AI request limit reached. Please wait before asking again.'
  );

module.exports = { generalLimiter, aiLimiter };
