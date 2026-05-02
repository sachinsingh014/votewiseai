'use strict';

jest.mock('firebase-admin', () => {
  const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-1', email: 'test@example.com', email_verified: true });
  const mockDocGet    = jest.fn();
  const mockDocSet    = jest.fn().mockResolvedValue({});
  const mockDocUpdate = jest.fn().mockResolvedValue({});

  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockDocGet, set: mockDocSet, update: mockDocUpdate }),
      }),
    }),
    auth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
    // Exposed for per-test reconfiguration
    _mockVerifyIdToken: mockVerifyIdToken,
    _mockDocGet:        mockDocGet,
    _mockDocSet:        mockDocSet,
    _mockDocUpdate:     mockDocUpdate,
  };
});

jest.mock('../../src/config/firebase', () => {
  const mockAdmin = jest.requireMock('firebase-admin');
  return {
    initFirebase: jest.fn(),
    // Delegate directly to the firebase-admin firestore mock so _mockDocGet controls behavior
    getDb: jest.fn(() => mockAdmin.firestore()),
  };
});

jest.mock('../../src/services/ai/ai.service', () => ({
  generateResponse: jest.fn().mockResolvedValue({ text: 'AI response', fromCache: false, fallback: false }),
  streamGemini: jest.fn(),
}));

const request   = require('supertest');
const admin     = require('firebase-admin');
const { generateResponse } = require('../../src/services/ai/ai.service');
const { buildApp } = require('./testApp');

let app;
const VALID_AUTH = 'Bearer valid-token';

const DEFAULT_ROADMAP = [
  { id: 1, title: 'Verify Voter ID Registration', status: 'action_required', icon: 'verified' },
  { id: 2, title: 'Find Polling Station',         status: 'locked',          icon: 'location_on' },
  { id: 3, title: 'Review Candidate Information', status: 'locked',          icon: 'how_to_vote' },
];

beforeAll(() => {
  app = buildApp();
});

beforeEach(() => {
  admin._mockVerifyIdToken.mockReset();
  admin._mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'test@example.com', email_verified: true });

  admin._mockDocGet.mockReset();
  admin._mockDocGet.mockResolvedValue({ exists: true, data: () => ({ roadmap: DEFAULT_ROADMAP }) });

  admin._mockDocSet.mockClear();
  admin._mockDocUpdate.mockClear();

  generateResponse.mockReset();
  generateResponse.mockResolvedValue({ text: 'Step 1: Check registration at voterportal.eci.gov.in', fromCache: false, fallback: false });
});

describe('Journey routes', () => {
  describe('POST /api/journey/guide', () => {
    it('returns 200 with step-by-step guide for a first-time voter', async () => {
      const res = await request(app)
        .post('/api/journey/guide')
        .set('Authorization', VALID_AUTH)
        .send({ age: 22, state: 'Maharashtra', isFirstTime: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('steps');
      expect(res.body.data.profile).toMatchObject({ age: 22, state: 'Maharashtra' });
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/journey/guide')
        .send({ age: 22, state: 'Delhi', isFirstTime: true });

      expect(res.status).toBe(401);
    });

    it('returns 400 when age is below 18', async () => {
      const res = await request(app)
        .post('/api/journey/guide')
        .set('Authorization', VALID_AUTH)
        .send({ age: 16, state: 'Delhi', isFirstTime: true });

      expect(res.status).toBe(400);
    });

    it('returns 400 when state is missing', async () => {
      const res = await request(app)
        .post('/api/journey/guide')
        .set('Authorization', VALID_AUTH)
        .send({ age: 25, isFirstTime: false });

      expect(res.status).toBe(400);
    });

    it('returns fallback=true when AI service returns a fallback', async () => {
      generateResponse.mockResolvedValue({ text: 'Check eci.gov.in', fromCache: false, fallback: true });

      const res = await request(app)
        .post('/api/journey/guide')
        .set('Authorization', VALID_AUTH)
        .send({ age: 30, state: 'Kerala', isFirstTime: false });

      expect(res.status).toBe(200);
      expect(res.body.data.fallback).toBe(true);
    });
  });

  describe('GET /api/journey/progress', () => {
    it('returns 200 with roadmap when user document exists', async () => {
      const res = await request(app)
        .get('/api/journey/progress')
        .set('Authorization', VALID_AUTH);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('roadmap');
    });

    it('initializes and returns default roadmap for a new user', async () => {
      admin._mockDocGet.mockResolvedValue({ exists: false });

      const res = await request(app)
        .get('/api/journey/progress')
        .set('Authorization', VALID_AUTH);

      expect(res.status).toBe(200);
      expect(res.body.data.roadmap).toHaveLength(3);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/journey/progress');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/journey/progress', () => {
    it('returns 200 when completing step 1 (action_required)', async () => {
      const res = await request(app)
        .post('/api/journey/progress')
        .set('Authorization', VALID_AUTH)
        .send({ stepId: 1 });

      expect(res.status).toBe(200);
    });

    it('returns 400 for a non-existent step ID', async () => {
      const res = await request(app)
        .post('/api/journey/progress')
        .set('Authorization', VALID_AUTH)
        .send({ stepId: 99 });

      expect(res.status).toBe(400);
    });

    it('returns 400 when attempting to complete a locked step', async () => {
      const res = await request(app)
        .post('/api/journey/progress')
        .set('Authorization', VALID_AUTH)
        .send({ stepId: 2 });

      expect(res.status).toBe(400);
    });

    it('returns 404 when user roadmap does not exist', async () => {
      admin._mockDocGet.mockResolvedValue({ exists: false });

      const res = await request(app)
        .post('/api/journey/progress')
        .set('Authorization', VALID_AUTH)
        .send({ stepId: 1 });

      expect(res.status).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/journey/progress')
        .send({ stepId: 1 });

      expect(res.status).toBe(401);
    });
  });
});
