'use strict';

module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  globals: {
    AbortController: 'readonly',
    TextDecoder: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
  },
  extends: ['eslint:recommended'],
  rules: {
    // File and function size limits (adjusted for Express/Streaming patterns)
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    'max-depth': ['error', 4],
    'complexity': ['error', 10],
    'max-params': ['error', 5],

    // Code quality
    'no-console': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
};
