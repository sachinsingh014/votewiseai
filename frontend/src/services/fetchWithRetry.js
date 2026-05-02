/**
 * Resilient fetch utility with exponential backoff retry.
 *
 * Safety rules:
 * - ONLY retries GET requests (idempotent). POST/PUT/DELETE never auto-retry.
 * - Retries only on transient errors (network failure, 502, 503, 504).
 * - Permanent errors (400, 401, 403, 404, 409, 422, 429) fail immediately.
 * - Respects navigator.onLine — won't retry if the user is offline.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {{ maxRetries?: number, baseDelayMs?: number }} retryConfig
 */

const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);
const PERMANENT_STATUS_CODES = new Set([400, 401, 403, 404, 409, 426, 422, 429]); // Added 426 Upgrade Required

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const { maxRetries = 3, baseDelayMs = 500 } = retryConfig;
  const method = (options.method || 'GET').toUpperCase();

  // Inject strict client version handshake
  const headers = {
    ...options.headers,
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '1.0.0'
  };

  const finalOptions = { ...options, headers };

  // Never retry non-idempotent methods
  const isIdempotent = method === 'GET' || method === 'HEAD';

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Abort immediately if offline
    if (!navigator.onLine) {
      throw new Error('You are offline. Please check your connection.');
    }

    try {
      const res = await fetch(url, finalOptions);

      // Handle version mismatch explicitly
      if (res.status === 426) {
        console.error('[fetchWithRetry] Client version outdated. Hard refresh required.');
        // In a real app, you might trigger a forced window.location.reload(true) here
        return res; 
      }

      // Permanent errors — no point retrying
      if (PERMANENT_STATUS_CODES.has(res.status)) {
        return res; // Let the caller handle 401, 429, etc.
      }

      // Transient server error — retry if idempotent
      if (TRANSIENT_STATUS_CODES.has(res.status) && isIdempotent && attempt < maxRetries) {
        // Exponential backoff with 20% randomized jitter to prevent thundering herd
        const base = baseDelayMs * Math.pow(2, attempt);
        const jitter = base * 0.2 * (Math.random() * 2 - 1); 
        const delay = Math.max(100, Math.floor(base + jitter));
        
        console.warn(`[fetchWithRetry] ${res.status} on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      return res;
    } catch (err) {
      // If the request was explicitly aborted, DO NOT retry. Throw immediately.
      if (err.name === 'AbortError') throw err;

      lastError = err;

      // Network error (e.g., ERR_CONNECTION_REFUSED) — retry if idempotent
      if (isIdempotent && attempt < maxRetries) {
        const base = baseDelayMs * Math.pow(2, attempt);
        const jitter = base * 0.2 * (Math.random() * 2 - 1); 
        const delay = Math.max(100, Math.floor(base + jitter));
        
        console.warn(`[fetchWithRetry] Network error on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }

  throw lastError || new Error('Request failed after maximum retries.');
}
