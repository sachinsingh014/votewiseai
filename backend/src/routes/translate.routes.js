'use strict';

const express = require('express');
const { translateText } = require('../controllers/translate.controller');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @route   POST /api/translate
 * @desc    Translate text to regional languages
 * @access  Public
 */
router.post(
  '/',
  [
    body('text').notEmpty().withMessage('Text to translate is required'),
    body('targetLang').notEmpty().withMessage('Target language code is required'),
  ],
  validate,
  translateText
);

module.exports = router;
