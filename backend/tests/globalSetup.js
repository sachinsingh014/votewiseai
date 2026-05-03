'use strict';

/**
 * Global test setup — runs once before all test suites.
 * Validates the test environment and sets required env vars.
 */
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '8081';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project';
  process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
  process.env.VERTEX_AI_MODEL = 'gemini-2.5-flash';
  process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX = '100';
  process.env.AI_RATE_LIMIT_WINDOW_MS = '60000';
  process.env.AI_RATE_LIMIT_MAX = '10';
  process.env.CACHE_TTL = '3600';
};
