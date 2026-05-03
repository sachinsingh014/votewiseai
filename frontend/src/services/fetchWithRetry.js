/**
 * @fileoverview Resilient fetch utility with exponential backoff retry for VoteWise AI frontend.
 * @module services/fetchWithRetry
 *
 * Safety rules enforced by this module:
 *  - ONLY retries GET/HEAD requests (idempotent). POST/PUT/DELETE never auto-retry.
 *  - Retries only on transient server errors (502, 503, 504) and network failures.
 *  - Permanent client errors (400, 401, 403, 404, 409, 422, 429) fail immediately.
 *  - Respects navigator.onLine — won't retry if the browser reports offline status.
 *  - Injects X-App-Version header for server-side client version detection.
 *
 * PERFORMANCE: Uses exponential backoff with ±20% randomized jitter to prevent
 * thundering herd effects when many clients retry simultaneously after an outage.
 */

/**
 * HTTP status codes that indicate transient server errors worth retrying.
 * @type {Set<number>}
 */
const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);

/**
 * HTTP status codes that indicate permanent errors — retrying would not help.
 * @type {Set<number>}
 */
const PERMANENT_STATUS_CODES = new Set([400, 401, 403, 404, 409, 426, 422, 429]);

/**
 * Returns a Promise that resolves after the given number of milliseconds.
 *
 * @param {number} ms - Duration to sleep in milliseconds
 * @returns {Promise<void>} Promise that resolves after the delay
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates the delay for a retry attempt using exponential backoff with jitter.
 * Formula: clamp(baseDelayMs × 2^attempt ± 20% jitter, 100ms, ∞)
 *
 * COMPLEXITY: O(1)
 *
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} attempt - Current attempt index (0-based)
 * @returns {number} Computed delay in milliseconds (minimum 100ms)
 */
const computeDelay = (baseDelayMs, attempt) => {
  const base = baseDelayMs * Math.pow(2, attempt);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(100, Math.floor(base + jitter));
};

/**
 * @typedef {Object} RetryConfig
 * @property {number} [maxRetries=3] - Maximum number of retry attempts
 * @property {number} [baseDelayMs=500] - Base delay in ms for exponential backoff
 */

/**
 * Fetches a URL with automatic retry on transient failures.
 * Injects the X-App-Version header for all requests to enable server-side
 * version compatibility checks (responds with 426 if client is outdated).
 *
 * @param {string} url - The endpoint URL to fetch
 * @param {RequestInit} [options={}] - Standard fetch options (method, headers, body, signal)
 * @param {RetryConfig} [retryConfig={}] - Retry behaviour configuration
 * @returns {Promise<Response>} The fetch Response object
 * @throws {Error} If the request exceeds maxRetries, is explicitly aborted, or the browser is offline
 *
 * @example
 * const res = await fetchWithRetry('/api/health/liveness', { method: 'GET' });
 * if (!res.ok) throw new Error('Backend unavailable');
 * const data = await res.json();
 */
export async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const { maxRetries = 3, baseDelayMs = 500 } = retryConfig;
  const method = (options.method || 'GET').toUpperCase();

  // Inject client version header for server-side compatibility detection
  const headers = {
    ...options.headers,
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  };

  const finalOptions = { ...options, headers };

  // Only GET and HEAD are safe to retry without risk of duplicate side-effects
  const isIdempotent = method === 'GET' || method === 'HEAD';

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Abort immediately if the browser reports no network connection
    if (!navigator.onLine) {
      throw new Error('You are offline. Please check your connection.');
    }

    try {
      const res = await fetch(url, finalOptions);

      // 426 Upgrade Required — client version is outdated, do not retry
      if (res.status === 426) {
        return res;
      }

      // Permanent errors — pass through to the caller immediately
      if (PERMANENT_STATUS_CODES.has(res.status)) {
        return res;
      }

      // Transient server error — retry with exponential backoff if safe to do so
      if (TRANSIENT_STATUS_CODES.has(res.status) && isIdempotent && attempt < maxRetries) {
        const delay = computeDelay(baseDelayMs, attempt);
        await sleep(delay);
        continue;
      }

      return res;
    } catch (err) {
      // AbortError means the caller explicitly cancelled — never retry
      if (err.name === 'AbortError') throw err;

      lastError = err;

      // Network failure (e.g., ERR_CONNECTION_REFUSED) — retry if idempotent
      if (isIdempotent && attempt < maxRetries) {
        const delay = computeDelay(baseDelayMs, attempt);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }

  throw lastError || new Error('Request failed after maximum retries.');
}
