'use strict';

// Declare mock function inside factory with allowed naming convention
jest.mock('firebase-admin', () => {
  const mockVerifyIdToken = jest.fn();
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: jest.fn() }),
      }),
    }),
    auth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
    _mockVerifyIdToken: mockVerifyIdToken,
  };
});

jest.mock('../../src/utils/logger', () => ({
  warn: jest.fn(),
}));

const admin      = require('firebase-admin');
const authenticate = require('../../src/middleware/authenticate');

// Helper to create minimal Express-like req/res/next objects
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

describe('authenticate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req  = { headers: {} };
    res  = mockRes();
    next = jest.fn();
    admin._mockVerifyIdToken.mockReset();
  });

  it('returns 401 when Authorization header is absent', async () => {
    req.headers = {};
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with "Bearer "', async () => {
    req.headers.authorization = 'Token abc123';
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Firebase token verification fails', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    admin._mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and attaches decoded user to req.user on a valid token', async () => {
    const mockDecoded = { uid: 'user123', email: 'test@example.com' };
    req.headers.authorization = 'Bearer valid-token';
    admin._mockVerifyIdToken.mockResolvedValue(mockDecoded);

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(mockDecoded);
    expect(res.status).not.toHaveBeenCalled();
  });
});
