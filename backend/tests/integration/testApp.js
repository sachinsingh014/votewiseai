'use strict';

/**
 * Integration test app factory.
 * NOTE: Each integration test file provides its OWN jest.mock('firebase-admin') 
 * and jest.mock('../../src/config/firebase') BEFORE importing this module.
 * This file only mocks ai.service and creates the app — it does NOT mock Firebase.
 */

// Mock AI service — shared across all integration tests
jest.mock('../../src/services/ai/ai.service', () => ({
  generateResponse: jest.fn().mockResolvedValue({ text: 'AI response', fromCache: false, fallback: false }),
  streamGemini:     jest.fn(),
}));

// ── Real app creation ─────────────────────────────────────────────────────────
const { createApp } = require('../../src/server');

const testEnv = {
  NODE_ENV:                       'test',
  PORT:                           8080,
  ALLOWED_ORIGINS:                'http://localhost:5173',
  GOOGLE_CLOUD_PROJECT_ID:        'test-project',
  GOOGLE_CLOUD_LOCATION:          'us-central1',
  VERTEX_AI_MODEL:                'gemini-2.5-flash',
  GOOGLE_APPLICATION_CREDENTIALS: './credentials/fake.json',
  FIREBASE_PROJECT_ID:            'test-project',
  RATE_LIMIT_WINDOW_MS:           900000,
  RATE_LIMIT_MAX:                 10000,  // Very high — prevent 429 during tests
  AI_RATE_LIMIT_WINDOW_MS:        60000,
  AI_RATE_LIMIT_MAX:              10000,  // Very high — prevent 429 during tests
  CACHE_TTL:                      3600,
};

const buildApp = () => createApp(testEnv);

module.exports = { buildApp, testEnv };
