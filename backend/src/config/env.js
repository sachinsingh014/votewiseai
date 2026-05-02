'use strict';

const { cleanEnv, str, port, num } = require('envalid');

/**
 * Validates all environment variables on startup.
 * The server will crash immediately if any required variable is missing.
 */
const validateEnv = () => cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test'] }),
  PORT: port({ default: 8080 }),
  ALLOWED_ORIGINS: str({ default: 'http://localhost:5173', desc: 'Comma-separated list of allowed CORS origins' }),

  GOOGLE_CLOUD_PROJECT_ID: str(),
  GOOGLE_CLOUD_LOCATION: str({ default: 'us-central1' }),
  VERTEX_AI_MODEL: str({ default: 'gemini-2.5-flash' }),
  GOOGLE_APPLICATION_CREDENTIALS: str({ default: '', desc: 'Path to service account key JSON. Not required on Cloud Run (uses ADC).' }),

  FIREBASE_PROJECT_ID: str(),

  RATE_LIMIT_WINDOW_MS: num({ default: 900000 }),
  RATE_LIMIT_MAX: num({ default: 100 }),
  AI_RATE_LIMIT_WINDOW_MS: num({ default: 60000 }),
  AI_RATE_LIMIT_MAX: num({ default: 10 }),

  CACHE_TTL: num({ default: 3600 }),
});

module.exports = validateEnv;
