'use strict';

const express = require('express');
const { getAnalytics } = require('../controllers/analytics.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

/**
 * @route   GET /api/analytics
 * @desc    Get platform insights and AI stats
 * @access  Private
 */
router.get('/', authenticate, getAnalytics);

module.exports = router;
