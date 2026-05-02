import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
        TextDecoder: 'readonly',
      },
    },
    rules: {
      // File and function size limits (relaxed for express controllers)
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': 'off',
      'max-depth': 'off',
      'complexity': 'off',
      'max-params': 'off',

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
  },
  {
    // Allow console in server.js startup only
    files: ['src/server.js'],
    rules: { 'no-console': 'off' },
  },
  {
    // Relax rules in test files
    files: ['**/__tests__/**/*.js'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
    },
  },
];
