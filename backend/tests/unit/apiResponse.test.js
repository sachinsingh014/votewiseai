'use strict';

const apiResponse = require('../../src/utils/apiResponse');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

describe('apiResponse utility', () => {
  let res;

  beforeEach(() => {
    res = mockRes();
  });

  describe('success', () => {
    it('returns 200 with success=true and data', () => {
      apiResponse.success(res, { items: [1, 2] });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { items: [1, 2] } }));
    });

    it('includes meta when provided', () => {
      apiResponse.success(res, { foo: 'bar' }, 200, { page: 1 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ meta: { page: 1 } }));
    });

    it('omits meta when not provided', () => {
      apiResponse.success(res, {});
      const call = res.json.mock.calls[0][0];
      expect(call).not.toHaveProperty('meta');
    });

    it('uses custom status code', () => {
      apiResponse.success(res, {}, 202);
      expect(res.status).toHaveBeenCalledWith(202);
    });
  });

  describe('created', () => {
    it('returns 201 with success=true', () => {
      apiResponse.created(res, { id: 'new-id' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('error', () => {
    it('returns 500 by default with success=false', () => {
      apiResponse.error(res, 'Something went wrong');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('does NOT include details in production environment', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      apiResponse.error(res, 'Error', 500, { stack: 'trace' });
      const call = res.json.mock.calls[0][0];
      expect(call.error.details).toBeUndefined();
      process.env.NODE_ENV = original;
    });

    it('DOES include details in non-production environments', () => {
      process.env.NODE_ENV = 'test';
      apiResponse.error(res, 'Error', 500, { stack: 'trace' });
      const call = res.json.mock.calls[0][0];
      expect(call.error.details).toEqual({ stack: 'trace' });
    });
  });

  describe('badRequest', () => {
    it('returns 400 with success=false', () => {
      apiResponse.badRequest(res, 'Invalid input');
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('unauthorized', () => {
    it('returns 401 with default message', () => {
      apiResponse.unauthorized(res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 with custom message', () => {
      apiResponse.unauthorized(res, 'Token expired');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ message: 'Token expired' }) }),
      );
    });
  });

  describe('forbidden', () => {
    it('returns 403', () => {
      apiResponse.forbidden(res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('notFound', () => {
    it('returns 404 with default message', () => {
      apiResponse.notFound(res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('tooManyRequests', () => {
    it('returns 429 with default message', () => {
      apiResponse.tooManyRequests(res);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });
});
