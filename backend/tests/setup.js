'use strict';

// Suppress all Winston output during tests to keep test output clean.
// We still need the module to load, so we silence it at the transport level.
process.env.NODE_ENV = 'test';

// Mock the logger globally so no real output during tests
jest.mock('../src/utils/logger', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
