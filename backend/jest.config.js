'use strict';

module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',           // Integration entrypoint — covered by supertest
    '!src/utils/logger.js',     // Winston config — mocked globally in setup.js
    '!src/config/firebase.js',  // Firebase init — mocked globally in integration tests
    '!src/config/env.js',       // Envalid wrapper — no testable logic
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      functions:  75,
      lines:      75,
      branches:   55,
    },
    // File-level thresholds for critical business-logic files
    './src/services/ai/ai.cache.js':     { statements: 95, lines: 95 },
    './src/services/ai/ai.fallback.js':  { statements: 100, lines: 100 },
    './src/services/ai/ai.prompt.js':    { statements: 100, lines: 100 },
    './src/services/ai/ai.moderator.js': { statements: 95, lines: 95 },
    './src/middleware/authenticate.js':  { statements: 100, lines: 100 },
    './src/middleware/errorHandler.js':  { statements: 100, lines: 100 },
    './src/utils/apiResponse.js':        { statements: 95, lines: 95 },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 10000,
  // Silence logger noise during test runs
  setupFiles: ['./tests/setup.js'],
};
