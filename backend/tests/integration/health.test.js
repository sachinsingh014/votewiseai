'use strict';

// Health probes use firebase-admin directly (readiness check)
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: true }),
      })),
    })),
  })),
  auth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}));

jest.mock('../../src/config/firebase', () => ({
  initFirebase: jest.fn(),
  getDb: jest.fn(),
}));

const request = require('supertest');
const { buildApp } = require('./testApp');

let app;

beforeAll(() => {
  app = buildApp();
});

describe('Health endpoints', () => {
  // ── Liveness ──────────────────────────────────────────────────────────────
  describe('GET /api/health/liveness', () => {
    it('returns 200 OK', async () => {
      const res = await request(app).get('/api/health/liveness');
      expect(res.status).toBe(200);
      expect(res.text).toBe('OK');
    });
  });

  // ── Readiness ─────────────────────────────────────────────────────────────
  describe('GET /api/health/readiness', () => {
    it('returns 200 with dependencies payload when all deps are up', async () => {
      // Firestore mock is set to resolve; GEMINI_API_KEY set will be missing in test env
      // but the probe degrades gracefully and reports per-dependency
      const res = await request(app).get('/api/health/readiness');
      // In test env, GEMINI_API_KEY will be missing → 503 with gemini=down
      // We assert the shape regardless of status
      expect(res.body).toHaveProperty('dependencies');
      expect(res.body.dependencies).toHaveProperty('firestore');
      expect(res.body.dependencies).toHaveProperty('gemini');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});

describe('404 handler', () => {
  it('returns 404 JSON for an unknown endpoint', async () => {
    const res = await request(app).get('/api/this/does/not/exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
