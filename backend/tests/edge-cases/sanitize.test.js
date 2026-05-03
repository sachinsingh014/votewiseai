'use strict';

const mongoSanitize = require('../../src/middleware/sanitize');

describe('NoSQL Injection Sanitizer Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {};
    next = jest.fn();
  });

  it('strips $ne operator from body', () => {
    req.body = { email: { $ne: 'test@example.com' }, valid: 'value' };
    mongoSanitize()(req, res, next);
    expect(req.body).toEqual({ email: {}, valid: 'value' });
    expect(next).toHaveBeenCalled();
  });

  it('strips dot-notation from keys', () => {
    req.body = { 'user.name': 'admin', valid: 'value' };
    mongoSanitize()(req, res, next);
    expect(req.body).toEqual({ valid: 'value' });
  });

  it('handles nested objects recursively', () => {
    req.body = { nested: { $gt: 5, normal: 10 } };
    mongoSanitize()(req, res, next);
    expect(req.body).toEqual({ nested: { normal: 10 } });
  });

  it('leaves valid payload unchanged', () => {
    req.body = { name: 'Sachin', age: 30 };
    mongoSanitize()(req, res, next);
    expect(req.body).toEqual({ name: 'Sachin', age: 30 });
  });
});
