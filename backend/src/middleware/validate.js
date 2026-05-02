'use strict';

const { validationResult } = require('express-validator');
const apiResponse = require('../utils/apiResponse');

/**
 * Runs express-validator results and short-circuits with 400 if any fail.
 * Place this after your validation chains in a route definition.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  return apiResponse.badRequest(res, 'Validation failed', details);
};

module.exports = validate;
