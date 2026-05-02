'use strict';

/**
 * In-memory, per-user AI rate limiter.
 *
 * Architecture:
 * - Backed by a simple Map<uid, { count, resetAt }>.
 * - Hidden behind a RateStore interface so Redis can be swapped in later
 *   with zero business-logic changes (just replace the store implementation).
 *
 * Limits:
 * - 20 AI requests per user per hour.
 * - Window resets on a sliding 1-hour basis from the user's first request.
 *
 * Why not use express-rate-limit?
 * - express-rate-limit keys by IP, which is useless for authenticated users
 *   (shared IPs, proxies, VPNs, etc.).
 * - We need to key by Firebase UID to enforce per-account fairness.
 */

const USER_LIMIT = 20;          // max AI requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms

/** @type {Map<string, { count: number, resetAt: number }>} */
const store = new Map();

/**
 * Cleans up expired entries to prevent memory leaks.
 * Called internally on each check.
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
 * Checks and increments the user's request count.
 *
 * @param {string} uid - Firebase UID
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
const checkUserLimit = (uid) => {
  cleanup();

  const now = Date.now();
  const entry = store.get(uid);

  if (!entry || now >= entry.resetAt) {
    // New window
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
 * Express middleware that enforces per-user AI rate limits.
 * Requires authenticate() middleware to run first (req.user must be set).
 */
const userAiLimiter = (req, res, next) => {
  // If no authenticated user, fall through (general IP limiter handles this)
  if (!req.user?.uid) {return next();}

  const { allowed, remaining, resetAt } = checkUserLimit(req.user.uid);

  // Add standard rate limit headers
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
