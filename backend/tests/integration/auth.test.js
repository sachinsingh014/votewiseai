'use strict';

// jest.mock is hoisted — we cannot reference external vars inside the factory.
// Solution: declare mocks inside the factory using the allowed `mock` prefix variable names,
// then access them after via jest.mocked / require.
jest.mock('firebase-admin', () => {
  const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'test-uid', email: 'test@example.com', email_verified: true });
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: true }) }),
      }),
    }),
    auth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
    // Expose the mock so tests can reconfigure it
    _mockVerifyIdToken: mockVerifyIdToken,
  };
});

const request   = require('supertest');
const admin     = require('firebase-admin');
const { buildApp } = require('./testApp');

let app;
const VALID_TOKEN = 'Bearer valid-token';

beforeAll(() => {
  app = buildApp();
});

beforeEach(() => {
  // Reset and restore default success case
  admin._mockVerifyIdToken.mockReset();
  admin._mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid', email: 'test@example.com', email_verified: true });
});

describe('Auth routes', () => {
  describe('GET /api/auth/me', () => {
    it('returns 200 with user profile for a valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', VALID_TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        uid:           'test-uid',
        email:         'test@example.com',
        emailVerified: true,
      });
    });

    it('returns 401 for a missing Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 for an invalid/expired token', async () => {
      admin._mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired-token');

      expect(res.status).toBe(401);
    });
  });
});
