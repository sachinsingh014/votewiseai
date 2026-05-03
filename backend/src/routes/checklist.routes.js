'use strict';

const express = require('express');
const { getChecklist, updateChecklist } = require('../controllers/checklist.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @route   GET /api/checklist
 * @desc    Get the user's readiness checklist
 * @access  Private
 */
router.get('/', authenticate, getChecklist);

/**
 * @route   POST /api/checklist/update
 * @desc    Update a specific checklist item
 * @access  Private
 */
router.post(
  '/update',
  authenticate,
  [
    body('itemId').notEmpty().withMessage('Item ID is required'),
    body('completed').isBoolean().withMessage('Completed status must be a boolean'),
  ],
  validate,
  updateChecklist
);

module.exports = router;
