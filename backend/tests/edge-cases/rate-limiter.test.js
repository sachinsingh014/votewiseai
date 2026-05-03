'use strict';

const { userAiLimiter, checkUserLimit } = require('../../src/middleware/userRateLimiter');

describe('Per-User Rate Limiter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { uid: 'test-uid-123' } };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('allows request if under limit', () => {
    userAiLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 20);
  });

  it('blocks request and returns 429 after 20 requests', () => {
    const uid = 'limit-test-user';
    // Consume 20 requests
    for (let i = 0; i < 20; i++) {
      checkUserLimit(uid);
    }
    
    // Now request with the middleware
    req.user.uid = uid;
    userAiLimiter(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'USER_RATE_LIMIT_EXCEEDED'
        })
      })
    );
  });

  it('falls through silently if no user is present', () => {
    req.user = null;
    userAiLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
