'use strict';

/**
 * @fileoverview Journey Controller — manages the voter roadmap and AI-guided journey steps.
 * @module controllers/journey
 * @requires express-validator
 * @requires services/ai/ai.service
 * @requires services/ai/ai.prompt
 * @requires utils/apiResponse
 * @requires config/firebase
 * @requires utils/logger
 */

const { body } = require('express-validator');
const { generateResponse } = require('../services/ai/ai.service');
const { buildGuidePrompt } = require('../services/ai/ai.prompt');
const apiResponse = require('../utils/apiResponse');
const { getDb } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * @typedef {Object} RoadmapStep
 * @property {number} id - Unique step identifier (sequential)
 * @property {string} title - Display title of the step
 * @property {string} description - Detailed description of what the step involves
 * @property {'action_required'|'locked'|'completed'} status - Current step status
 * @property {string} icon - Material Symbol icon name for the step
 * @property {{ label: string, href: string }} [cta] - Optional call-to-action link
 */

/**
 * Default roadmap steps assigned to first-time users on initialization.
 * Steps are unlocked sequentially as the user completes each one.
 * @type {RoadmapStep[]}
 */
const DEFAULT_STEPS = [
  {
    id: 1,
    title: 'Verify Voter ID Registration',
    description: 'Confirm your name appears on the official electoral roll for your constituency.',
    status: 'action_required',
    icon: 'verified',
  },
  {
    id: 2,
    title: 'Find Polling Station',
    description: 'Locate your designated polling booth address and operating hours for election day.',
    status: 'locked',
    icon: 'location_on',
    cta: { label: 'Locate Now', href: '/chat' },
  },
  {
    id: 3,
    title: 'Review Candidate Information',
    description: 'Access unbiased, AI-curated summaries of candidates running in your constituency.',
    status: 'locked',
    icon: 'how_to_vote',
  },
];

/**
 * Applies a step completion to the roadmap array and unlocks the next step.
 * Pure function — does not mutate the input array.
 *
 * COMPLEXITY: O(n) where n is the number of roadmap steps.
 *
 * @param {RoadmapStep[]} roadmap - Current roadmap array from Firestore
 * @param {number} stepId - ID of the step to mark as completed
 * @returns {RoadmapStep[]} New roadmap array with the target step completed and next unlocked
 *
 * @example
 * const updated = applyStepCompletion(roadmap, 1);
 * // Step 1 → 'completed', Step 2 → 'action_required'
 */
const applyStepCompletion = (roadmap, stepId) =>
  roadmap.map((step) => {
    if (step.id === stepId) {return { ...step, status: 'completed' };}
    if (step.id === stepId + 1) {return { ...step, status: 'action_required' };}
    return step;
  });

/**
 * POST /api/journey/guide
 * Generates personalized step-by-step voting instructions using Gemini AI.
 * Instructions are tailored to the user's age, state, and first-time voter status.
 *
 * SECURITY: Protected by Firebase ID token. Rate-limited by userAiLimiter.
 * PERFORMANCE: Responses are cached by prompt hash to avoid redundant Gemini calls.
 *
 * @param {import('express').Request} req - Express request object
 * @param {number} req.body.age - User's age (must be >= 18)
 * @param {string} req.body.state - Indian state or union territory
 * @param {boolean} [req.body.isFirstTime=true] - Whether this is the user's first election
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON with personalized steps, voter profile, and cache/fallback flags
 * @throws {Error} Passes unexpected errors to Express error handler via next()
 *
 * @example
 * // POST /api/journey/guide
 * // Body: { "age": 22, "state": "Karnataka", "isFirstTime": true }
 * // Response: { "success": true, "data": { "steps": "...", "profile": {...} } }
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
 * Marks a roadmap step as complete for the authenticated user and unlocks the next step.
 *
 * SECURITY:
 *   - Only the authenticated user can update their OWN progress (enforced by uid from token).
 *   - Steps can only be completed if not already completed or locked.
 *   - Frontend cannot write to Firestore directly — all writes are server-side only.
 *
 * @param {import('express').Request} req - Express request object
 * @param {number} req.body.stepId - ID of the roadmap step to mark as completed
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON with the updated roadmap array
 * @throws {Error} Returns 404 if user not found; 400 if step is locked/missing; passes other errors to next()
 */
const completeStep = async (req, res, next) => {
  try {
    const { stepId } = req.body;
    const uid = req.user.uid;
    const userRef = getDb().collection('users').doc(uid);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {return apiResponse.notFound(res, 'Roadmap not found.');}

    const { roadmap } = docSnap.data();
    const targetStep = roadmap.find((s) => s.id === stepId);

    if (!targetStep) {return apiResponse.badRequest(res, `Step ${stepId} missing.`);}
    if (targetStep.status === 'completed') {return apiResponse.success(res, { roadmap, message: 'Done.' });}
    if (targetStep.status === 'locked') {return apiResponse.badRequest(res, 'Step locked.');}

    const updatedRoadmap = applyStepCompletion(roadmap, stepId);
    await userRef.update({ roadmap: updatedRoadmap, lastUpdated: new Date().toISOString() });
    logger.info({ event: 'step_completed', uid, stepId });

    return apiResponse.success(res, { roadmap: updatedRoadmap });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/journey/progress
 * Retrieves the authenticated user's current voter roadmap from Firestore.
 * On a user's first visit, initializes their roadmap with the default steps.
 *
 * SECURITY: Protected by Firebase ID token — users can only access their own roadmap.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON containing the user's roadmap array
 * @throws {Error} Passes Firestore errors to Express error handler via next()
 */
const getProgress = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const userRef = getDb().collection('users').doc(uid);
    const docSnap = await userRef.get();

    if (docSnap.exists) {
      return apiResponse.success(res, { roadmap: docSnap.data().roadmap });
    }

    // First-time user — initialize roadmap with default steps
    await userRef.set({ roadmap: DEFAULT_STEPS, createdAt: new Date().toISOString() });
    logger.info({ event: 'user_roadmap_initialized', uid });
    return apiResponse.success(res, { roadmap: DEFAULT_STEPS });
  } catch (err) {
    return next(err);
  }
};

// ── Input Validation Schemas ───────────────────────────────────────────────────

/**
 * Express-validator chain for the POST /api/journey/guide endpoint.
 * Validates that age meets minimum voting age (18) and state is non-empty.
 * @type {import('express-validator').ValidationChain[]}
 */
const guideValidation = [
  body('age').isInt({ min: 18, max: 120 }).withMessage('Must be at least 18 to vote'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('isFirstTime').optional().isBoolean(),
];

/**
 * Express-validator chain for the POST /api/journey/progress endpoint.
 * Validates that stepId is a positive integer.
 * @type {import('express-validator').ValidationChain[]}
 */
const progressValidation = [
  body('stepId').isInt({ min: 1 }).withMessage('Valid stepId is required'),
];

module.exports = { guide, completeStep, getProgress, guideValidation, progressValidation };
