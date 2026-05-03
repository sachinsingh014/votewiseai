'use strict';

/**
 * @fileoverview Per-user AI rate limiter for VoteWise AI backend.
 * @module middleware/userRateLimiter
 *
 * Architecture:
 *  - Backed by an in-memory Map keyed by Firebase UID (not IP address).
 *  - Hidden behind a simple store interface so Redis can be swapped in later
 *    with zero changes to the business logic in userAiLimiter.
 *  - Includes automatic cleanup of expired entries to prevent memory leaks.
 *
 * Limits: 20 AI requests per authenticated user per hour (sliding window).
 *
 * Why not use express-rate-limit?
 *  - express-rate-limit keys by IP, which fails for authenticated users
 *    sharing IPs (proxies, corporate networks, mobile NAT).
 *  - Keying by Firebase UID ensures per-account fairness.
 */

/** @constant {number} USER_LIMIT - Maximum AI requests per user per time window */
const USER_LIMIT = 20;

/** @constant {number} WINDOW_MS - Rate limit time window duration in milliseconds (1 hour) */
const WINDOW_MS = 60 * 60 * 1000;

/**
 * @typedef {Object} RateEntry
 * @property {number} count - Number of requests made within the current window
 * @property {number} resetAt - Unix timestamp (ms) when the current window expires
 */

/**
 * In-memory store mapping Firebase UIDs to their current rate limit state.
 * @type {Map<string, RateEntry>}
 */
const store = new Map();

/**
 * Removes expired rate limit entries from the in-memory store.
 * Called before every rate check to prevent unbounded memory growth.
 *
 * COMPLEXITY: O(n) where n is the number of tracked users — typically small in practice.
 *
 * @returns {void}
 */
const cleanup = () => {
  const now = Date.now();
  for (const [uid, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(uid);
    }
  }
};

/**
 * Checks whether a user is within their rate limit and increments their counter.
 * Creates a new rate window if the user has no entry or their window has expired.
 *
 * SECURITY: Only the Firebase UID is stored — no PII is retained in the rate store.
 *
 * @param {string} uid - The authenticated user's Firebase UID
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }} Rate limit result
 *
 * @example
 * const { allowed, remaining, resetAt } = checkUserLimit('uid_abc123');
 * // allowed: true, remaining: 19, resetAt: <timestamp 1hr from now>
 */
const checkUserLimit = (uid) => {
  cleanup();

  const now = Date.now();
  const entry = store.get(uid);

  if (!entry || now >= entry.resetAt) {
    // Start a fresh window for this user
    store.set(uid, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: USER_LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= USER_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: USER_LIMIT - entry.count, resetAt: entry.resetAt };
};

/**
 * Express middleware that enforces per-user AI request rate limits.
 * Must run AFTER `authenticate` middleware so that `req.user.uid` is populated.
 * Falls through silently if no authenticated user is present (IP limiter handles that case).
 *
 * SECURITY: Sets standard X-RateLimit-* headers so clients can implement
 * back-off strategies and display usage information to users.
 *
 * @param {import('express').Request} req - Express request object (requires req.user.uid)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void} Calls next() if within limit; returns 429 JSON if limit exceeded
 */
const userAiLimiter = (req, res, next) => {
  // Fall through if no authenticated user — the IP-based general limiter handles this
  if (!req.user?.uid) { return next(); }

  const { allowed, remaining, resetAt } = checkUserLimit(req.user.uid);

  // Expose standard rate limit headers for client-side back-off handling
  res.setHeader('X-RateLimit-Limit', USER_LIMIT);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'USER_RATE_LIMIT_EXCEEDED',
        message: 'You have reached your hourly AI request limit. Please wait before asking again.',
        resetAt: new Date(resetAt).toISOString(),
      },
    });
  }

  return next();
};

module.exports = { userAiLimiter, checkUserLimit };
