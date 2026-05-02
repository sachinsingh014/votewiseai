'use strict';

const winston = require('winston');

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

// Dynamic Log Sampling (Fixes #6)
// Keeps 100% of errors/warnings, but samples INFO logs at 10% in production to control Cloud Logging costs.
const sampleFormat = winston.format((info) => {
  if (process.env.NODE_ENV !== 'production') {return info;}
  if (info.level === 'warn' || info.level === 'error') {return info;}
  // Sample INFO logs at exactly 10%
  return Math.random() < 0.1 ? info : false;
});

const productionFormat = combine(
  sampleFormat(),
  errors({ stack: true }),
  timestamp(),
  json()
);

const developmentFormat = combine(
  colorize(),
  simple()
);

/**
 * Structured Winston logger.
 * Outputs JSON in production for log aggregation tools.
 * Outputs colored simple format in development.
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [
    new winston.transports.Console(),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
