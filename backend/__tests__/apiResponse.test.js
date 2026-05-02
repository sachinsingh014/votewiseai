'use strict';

const apiResponse = require('../src/utils/apiResponse');

describe('apiResponse', () => {
  it('should format a success response', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    apiResponse.success(res, { foo: 'bar' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { foo: 'bar' } });
  });

  it('should format an error response', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    apiResponse.error(res, 'Something broke', 500);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ message: 'Something broke' })
    }));
  });
});
