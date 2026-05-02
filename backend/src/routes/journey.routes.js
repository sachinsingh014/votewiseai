'use strict';

const { Router } = require('express');
const { guide, completeStep, getProgress, guideValidation, progressValidation } = require('../controllers/journey.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { userAiLimiter } = require('../middleware/userRateLimiter');

const router = Router();

/**
 * GET /api/journey/progress
 * Returns the authenticated user's current roadmap.
 * Initializes roadmap on first visit.
 */
router.get('/progress', authenticate, getProgress);

/**
 * POST /api/journey/progress
 * Marks a step as complete — enforces sequential ordering.
 * Frontend can no longer write to Firestore directly.
 */
router.post('/progress', authenticate, progressValidation, validate, completeStep);

/**
 * POST /api/journey/guide
 * Generates a personalized AI voting guide for authenticated users.
 */
router.post('/guide', authenticate, userAiLimiter, guideValidation, validate, guide);

module.exports = router;
