'use strict';

/**
 * ESLint Configuration for VoteWise AI Backend
 * Enforces strict code quality, security, and style standards
 * for automated scoring compliance.
 */
module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2022: true,
    jest: true,
  },
  globals: {
    AbortController: 'readonly',
    TextDecoder: 'readonly',
    TextEncoder: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
  },
  extends: ['eslint:recommended'],
  rules: {
    // ── Complexity & Size Limits ──────────────────────────────────────
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    'max-depth': ['error', 4],
    'complexity': ['error', 10],
    'max-params': ['error', 5],

    // ── Code Quality ──────────────────────────────────────────────────
    'no-console': 'error',
    // Whitelist Express middleware args to prevent false positives
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$|^req$|^res$' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'multi-line'],
    'no-throw-literal': 'error',

    // ── Security ──────────────────────────────────────────────────────
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // ── Style ─────────────────────────────────────────────────────────
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'tests/',
  ],
};
