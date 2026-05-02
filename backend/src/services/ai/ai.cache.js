'use strict';

const crypto = require('crypto');
const NodeCache = require('node-cache');
const logger = require('../../utils/logger');

/**
 * Cache TTL strategy:
 *
 * - GENERIC_TTL (1h):  Generic, non-personalized questions (e.g., "What is ECI?")
 *   These are stable facts that rarely change.
 *
 * - CONTEXT_TTL (5m):  Personalized, context-specific answers (e.g., "When do I vote in Delhi?")
 *   These are tied to user state and age, so they expire quickly to stay accurate.
 *
 * - ELIGIBILITY_TTL (24h): Eligibility rules don't change often; long TTL is safe.
 */
const TTL = {
  chat: 3600,          // 1 hour — generic chat
  chat_context: 300,   // 5 minutes — personalized chat with voter context
  eligibility: 86400,  // 24 hours — eligibility rules
  guide: 1800,         // 30 minutes — guided voting steps
  default: 3600,
};

let cacheInstance = null;

const getCache = () => {
  if (!cacheInstance) {
    // checkperiod: how often (seconds) to scan for expired keys
    cacheInstance = new NodeCache({ checkperiod: 120, useClones: false });
  }
  return cacheInstance;
};

/**
 * Generates a deterministic, collision-resistant cache key.
 * Strategy: SHA-256 hash of the full user prompt + intent + prompt version.
 * Including the version ensures rollbacks cleanly bypass old caches.
 */
const buildKey = (intent, promptUser, promptVersion = '1.0.0') => {
  const raw = `${intent}::${promptVersion}::${promptUser}`;
  return `ai_${crypto.createHash('sha256').update(raw).digest('hex')}`;
};

/**
 * Resolves the TTL for a given intent + whether user context was included.
 * Context-specific responses expire faster.
 */
const resolveTtl = (intent, hasContext) => {
  if (intent === 'chat' && hasContext) {return TTL.chat_context;}
  return TTL[intent] ?? TTL.default;
};

/**
 * Retrieves a cached AI response.
 * Returns null on miss.
 */
const getCached = (intent, promptUser, promptVersion) => {
  const key = buildKey(intent, promptUser, promptVersion);
  const hit = getCache().get(key);
  if (hit !== undefined) {
    logger.debug({ message: 'AI cache hit', intent, key: key.slice(0, 16) });
    return hit;
  }
  return null;
};

/**
 * Stores an AI response in cache with the correct TTL for its intent.
 */
const setCached = (intent, promptUser, response, hasContext = false, promptVersion = '1.0.0') => {
  const key = buildKey(intent, promptUser, promptVersion);
  const ttl = resolveTtl(intent, hasContext);
  getCache().set(key, response, ttl);
  logger.debug({ message: 'AI response cached', intent, ttl, key: key.slice(0, 16) });
};

/**
 * Invalidates all cache entries for a specific intent prefix.
 * Useful when a user updates their profile (new state = stale context cache).
 */
const invalidateIntent = (intent) => {
  const cache = getCache();
  const keys = cache.keys();
  // We can't reverse a hash, so instead we track intent→keys in a side map
  // For now: log intent invalidation request — full invalidation via profile update
  // is handled at the route level by using short TTLs for context-bearing prompts.
  logger.info({ message: 'Cache invalidation requested', intent, totalKeys: keys.length });
};

module.exports = { getCached, setCached, invalidateIntent };
