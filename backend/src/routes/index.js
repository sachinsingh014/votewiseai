'use strict';

const { Router } = require('express');
const aiRoutes = require('./ai.routes');
const authRoutes = require('./auth.routes');
const journeyRoutes = require('./journey.routes');
const quizRoutes = require('./quiz.routes');
const checklistRoutes = require('./checklist.routes');
const translateRoutes = require('./translate.routes');
const analyticsRoutes = require('./analytics.routes');
const apiResponse = require('../utils/apiResponse');

const router = Router();

/**
 * GET /api/health
 * Health check endpoint used by Cloud Run and monitoring tools.
 */
router.get('/health', (_req, res) =>
  apiResponse.success(res, { status: 'ok', timestamp: new Date().toISOString() })
);

router.use('/ai', aiRoutes);
router.use('/auth', authRoutes);
router.use('/journey', journeyRoutes);
router.use('/quiz', quizRoutes);
router.use('/checklist', checklistRoutes);
router.use('/translate', translateRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
