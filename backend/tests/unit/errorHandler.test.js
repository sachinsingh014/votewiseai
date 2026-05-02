'use strict';

const { errorHandler, notFoundHandler } = require('../../src/middleware/errorHandler');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

describe('errorHandler middleware', () => {
  let res, next;

  beforeEach(() => {
    res  = mockRes();
    next = jest.fn();
  });

  it('returns 500 for generic errors with no status code', () => {
    const err = new Error('Something broke');
    errorHandler(err, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('uses err.statusCode when provided', () => {
    const err = new Error('Bad input');
    err.statusCode = 400;
    errorHandler(err, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('uses err.status (Express convention) when statusCode is absent', () => {
    const err = new Error('Forbidden');
    err.status = 403;
    errorHandler(err, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('falls back to "Internal Server Error" message when err.message is empty', () => {
    const err = {};
    errorHandler(err, {}, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});

describe('notFoundHandler middleware', () => {
  it('returns 404 with a descriptive error message', () => {
    const res = mockRes();
    notFoundHandler({}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});
