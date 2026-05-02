'use strict';

/**
 * Standardized API response wrapper.
 * Every endpoint returns the same JSON shape.
 */

const success = (res, data, statusCode = 200, meta = null) => {
  const body = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
};

const created = (res, data) => success(res, data, 201);

const error = (res, message, statusCode = 500, details = null) => {
  const body = { success: false, error: { message } };
  if (details && process.env.NODE_ENV !== 'production') {
    body.error.details = details;
  }
  return res.status(statusCode).json(body);
};

const badRequest = (res, message, details = null) =>
  error(res, message, 400, details);

const unauthorized = (res, message = 'Unauthorized') =>
  error(res, message, 401);

const forbidden = (res, message = 'Forbidden') =>
  error(res, message, 403);

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404);

const tooManyRequests = (res, message = 'Too many requests') =>
  error(res, message, 429);

module.exports = { success, created, error, badRequest, unauthorized, forbidden, notFound, tooManyRequests };
