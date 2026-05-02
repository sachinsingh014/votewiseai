'use strict';

const { body } = require('express-validator');
const { generateResponse } = require('../services/ai/ai.service');
const { buildGuidePrompt } = require('../services/ai/ai.prompt');
const apiResponse = require('../utils/apiResponse');
const { getDb } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * POST /api/journey/guide
 * Generates personalized step-by-step voting instructions.
 * Protected: requires Firebase ID token.
 */
const guide = async (req, res, next) => {
  try {
    const { age, state, isFirstTime = true } = req.body;
    const prompt = buildGuidePrompt({ age, state, isFirstTime });
    const result = await generateResponse(req.env, prompt, 'guide', { uid: req.user.uid });
    return apiResponse.success(res, {
      steps: result.text,
      profile: { age, state, isFirstTime },
      fromCache: result.fromCache,
      fallback: result.fallback || false,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/journey/progress
 * Marks a roadmap step as complete for the authenticated user.
 *
 * Security model:
 * - Only the authenticated user can update their OWN progress (enforced by uid).
 * - Steps can only be completed in order — no skipping allowed.
 * - Frontend cannot write to Firestore directly.
 *
 * Audit log: Every completion event is written to a structured winston log.
 */
const completeStep = async (req, res, next) => {
  try {
    const { stepId } = req.body;
    const uid = req.user.uid;

    const db = getDb();
    const userRef = db.collection('users').doc(uid);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      return apiResponse.notFound(res, 'User roadmap not found. Please visit the dashboard first.');
    }

    const { roadmap } = docSnap.data();

    // --- Step ordering enforcement ---
    // Find the step to complete
    const targetIndex = roadmap.findIndex((s) => s.id === stepId);
    if (targetIndex === -1) {
      return apiResponse.badRequest(res, `Step ${stepId} does not exist.`);
    }

    const targetStep = roadmap[targetIndex];

    // Already completed — idempotent, return success
    if (targetStep.status === 'completed') {
      return apiResponse.success(res, { roadmap, message: 'Step already completed.' });
    }

    // Enforce sequential completion — no skipping
    if (targetStep.status === 'locked') {
      return apiResponse.badRequest(res, 'Cannot complete a locked step. Complete previous steps first.');
    }

    // Build updated roadmap
    const updatedRoadmap = roadmap.map((step) => {
      if (step.id === stepId) {return { ...step, status: 'completed' };}
      if (step.id === stepId + 1) {return { ...step, status: 'action_required' };}
      return step;
    });

    // Persist to Firestore via Admin SDK (secure, server-side)
    await userRef.update({
      roadmap: updatedRoadmap,
      lastUpdated: new Date().toISOString(),
    });

    // Structured audit log
    logger.info({
      event: 'step_completed',
      uid,
      stepId,
      stepTitle: targetStep.title,
      timestamp: new Date().toISOString(),
    });

    return apiResponse.success(res, { roadmap: updatedRoadmap });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/journey/progress
 * Retrieves the authenticated user's current roadmap from Firestore.
 * Initializes with default steps if first visit.
 */
const DEFAULT_STEPS = [
  { id: 1, title: 'Verify Voter ID Registration', description: 'Confirm your name appears on the official electoral roll for your constituency.', status: 'action_required', icon: 'verified' },
  { id: 2, title: 'Find Polling Station', description: 'Locate your designated polling booth address and operating hours for election day.', status: 'locked', icon: 'location_on', cta: { label: 'Locate Now', href: '/chat' } },
  { id: 3, title: 'Review Candidate Information', description: 'Access unbiased, AI-curated summaries of candidates running in your constituency.', status: 'locked', icon: 'how_to_vote' },
];

const getProgress = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getDb();
    const userRef = db.collection('users').doc(uid);
    const docSnap = await userRef.get();

    if (docSnap.exists) {
      return apiResponse.success(res, { roadmap: docSnap.data().roadmap });
    }

    // First-time user — initialize
    await userRef.set({ roadmap: DEFAULT_STEPS, createdAt: new Date().toISOString() });
    logger.info({ event: 'user_roadmap_initialized', uid });
    return apiResponse.success(res, { roadmap: DEFAULT_STEPS });
  } catch (err) {
    return next(err);
  }
};

const guideValidation = [
  body('age').isInt({ min: 18, max: 120 }).withMessage('Must be at least 18 to vote'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('isFirstTime').optional().isBoolean(),
];

const progressValidation = [
  body('stepId').isInt({ min: 1 }).withMessage('Valid stepId is required'),
];

module.exports = { guide, completeStep, getProgress, guideValidation, progressValidation };
