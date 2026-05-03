'use strict';

const express = require('express');
const { getQuiz, submitQuiz } = require('../controllers/quiz.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @route   GET /api/quiz
 * @desc    Get a random election knowledge quiz
 * @access  Public
 */
router.get('/', getQuiz);

/**
 * @route   POST /api/quiz/submit
 * @desc    Submit quiz answers and get a score
 * @access  Private
 */
router.post(
  '/submit',
  authenticate,
  [
    body('answers').isArray().withMessage('Answers must be an array'),
  ],
  validate,
  submitQuiz
);

module.exports = router;
