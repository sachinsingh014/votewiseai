'use strict';

const rateLimit = require('express-rate-limit');
const apiResponse = require('../utils/apiResponse');

const buildLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => apiResponse.tooManyRequests(res, message),
  });

/**
 * General API limiter: 100 requests per 15 minutes.
 * Applied to all routes as a baseline.
 */
const generalLimiter = (env) =>
  buildLimiter(
    env.RATE_LIMIT_WINDOW_MS,
    env.RATE_LIMIT_MAX,
    'Too many requests. Please try again later.'
  );

/**
 * Strict AI limiter: 10 requests per minute.
 * Applied only to Gemini/AI endpoints to protect budget.
 */
const aiLimiter = (env) =>
  buildLimiter(
    env.AI_RATE_LIMIT_WINDOW_MS,
    env.AI_RATE_LIMIT_MAX,
    'AI request limit reached. Please wait before asking again.'
  );

module.exports = { generalLimiter, aiLimiter };
