'use strict';

/**
 * @fileoverview Express-validator result handler middleware for VoteWise AI backend.
 * @module middleware/validate
 * @requires express-validator
 * @requires utils/apiResponse
 *
 * Provides a single middleware function that reads the accumulated express-validator
 * results and short-circuits with a 400 Bad Request response if any validation failed.
 * Place this AFTER all validation chains in your route definition.
 */

const { validationResult } = require('express-validator');
const apiResponse = require('../utils/apiResponse');

/**
 * Reads express-validator results accumulated by preceding validation chains.
 * If any field failed validation, responds immediately with a structured 400 error
 * listing each invalid field and its failure reason.
 * If all validations pass, calls next() to continue to the route handler.
 *
 * @param {import('express').Request} req - Express request object (with validation results attached)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {import('express').Response|void} 400 JSON on failure; calls next() on success
 *
 * @example
 * // In a route definition:
 * router.post('/chat', chatValidation, validate, chatController.chat);
 * // If 'question' is missing: 400 { success: false, error: { message: 'Validation failed',
 * //   details: [{ field: 'question', message: 'Question is required' }] } }
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
