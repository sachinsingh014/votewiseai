'use strict';

const { Router } = require('express');
const { chat, chatStream, checkEligibility, chatValidation, eligibilityValidation } = require('../controllers/ai.controller');
const authenticate = require('../middleware/authenticate');
const { userAiLimiter } = require('../middleware/userRateLimiter');
const validate = require('../middleware/validate');

const router = Router();

/**
 * GET /api/ai/chat/stream
 * Server-Sent Events streaming endpoint.
 * Protected by Firebase auth + per-user rate limit.
 */
router.get('/chat/stream', authenticate, userAiLimiter, chatStream);

/**
 * POST /api/ai/chat
 * Standard JSON response — fallback for non-SSE environments.
 * Protected by Firebase auth + per-user rate limit.
 */
router.post('/chat', authenticate, userAiLimiter, chatValidation, validate, chat);

/**
 * POST /api/ai/eligibility
 * Check voter eligibility by age and state.
 */
router.post('/eligibility', authenticate, userAiLimiter, eligibilityValidation, validate, checkEligibility);

module.exports = router;
