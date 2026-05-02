'use strict';

const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');

/**
 * Global error handling middleware.
 * Catches all errors passed via next(err) from any route or controller.
 * Returns a standardized JSON error response.
 */
const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    message,
    statusCode,
    stack: err.stack,
  });

  return apiResponse.error(res, message, statusCode, err.details);
};

/**
 * 404 handler for unmatched routes.
 */
const notFoundHandler = (_req, res) =>
  apiResponse.notFound(res, 'The requested endpoint does not exist.');

module.exports = { errorHandler, notFoundHandler };
