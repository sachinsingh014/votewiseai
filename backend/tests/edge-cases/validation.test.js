'use strict';

const validate = require('../../src/middleware/validate');
const { body, validationResult } = require('express-validator');

describe('Validation Result Handler Middleware', () => {
  it('calls next() if no validation errors', async () => {
    const req = { body: { name: 'test' } };
    const res = {};
    const next = jest.fn();
    
    await body('name').notEmpty().run(req);
    validate(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 with details if validation fails', async () => {
    const req = { body: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();
    
    await body('name').notEmpty().withMessage('Name is required').run(req);
    validate(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Name is required'
            })
          ])
        })
      })
    );
  });
});
