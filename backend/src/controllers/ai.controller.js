'use strict';

const { body } = require('express-validator');
const crypto = require('crypto');
const { generateResponse, streamGemini } = require('../services/ai/ai.service');
const { buildChatPrompt, buildEligibilityPrompt } = require('../services/ai/ai.prompt');
const { getCached } = require('../services/ai/ai.cache');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Tracks active request IDs to enforce idempotency and prevent duplicate generations.
 * Cleared when stream finishes or aborts.
 */
const activeRequests = new Set();

/**
 * POST /api/ai/chat
 * Standard (non-streaming) Q&A — used as fallback if client doesn't support SSE.
 * Accepts optional voter context for personalized answers.
 * Protected: requires Firebase ID token.
 */
const chat = async (req, res, next) => {
  try {
    const { question, language = 'English', context = null } = req.body;
    const uid = req.user?.uid || 'anon';

    const prompt = buildChatPrompt(question, language, context);
    const result = await generateResponse(req.env, prompt, 'chat', { uid });

    return apiResponse.success(res, {
      answer: result.text,
      fromCache: result.fromCache,
      fallback: result.fallback || false,
      flagged: result.flagged || false,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/ai/chat/stream
 * Server-Sent Events streaming endpoint.
 *
 * Client sends: question, language, context as query params.
 * Server sends: SSE stream of { text } chunks, terminated by [DONE].
 *
 * Reconnection recovery:
 * - Client passes requestId on retry.
 * - If the full response is already cached for this requestId, it's returned immediately.
 *
 * Backpressure:
 * - Each chunk write checks res.writableEnded before flushing.
 * - AbortController cancels the upstream Gemini connection if client disconnects.
 */
const chatStream = async (req, res, next) => {
  // Parse params from query string (GET request for SSE)
  const { question, language = 'English', requestId: clientRequestId } = req.query;
  let context = null;
  try {
    context = req.query.context ? JSON.parse(req.query.context) : null;
  } catch {
    // If JSON parsing fails, just leave it as null
  }

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' });
  }
  if (question.length > 500) {
    return res.status(400).json({ error: 'Question too long' });
  }

  const uid = req.user?.uid || 'anon';
  const requestId = clientRequestId || crypto.randomUUID();
  // Extract GCP Cloud Trace Context (Fixes #11)
  const traceId = req.headers['x-cloud-trace-context']?.split('/')[0] || requestId;

  // Enforce idempotency: prevent identical in-flight requests
  if (activeRequests.has(requestId)) {
    return res.status(409).json({ error: 'Duplicate request already in progress.' });
  }

  const prompt = buildChatPrompt(question, language, context);

  // Reconnection recovery: if client reconnects with same requestId and we have the cache, serve it
  const cached = getCached('chat', prompt.user, prompt.version);
  if (cached && clientRequestId) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ text: cached, fromCache: true, done: true })}\n\n`);
    res.end();
    return;
  }

  const controller = new AbortController();
  req.on('close', () => {
    controller.abort();
    activeRequests.delete(requestId);
    logger.debug({ event: 'stream_client_disconnected', uid, requestId, 'logging.googleapis.com/trace': traceId });
  });

  activeRequests.add(requestId);

  try {
    logger.info({ event: 'stream_started', uid, requestId, 'logging.googleapis.com/trace': traceId });
    await streamGemini(req.env, prompt, 'chat', res, controller, requestId);
  } catch (err) {
    // If client already disconnected (AbortError), don't try to write
    if (err.name === 'AbortError') {return;}

    logger.error({ event: 'stream_error', uid, requestId, error: err.message });

    // Fallback: if SSE headers not sent yet, return JSON error
    if (!res.headersSent) {
      return next(err);
    }

    // If mid-stream, send error sentinel and close
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: 'Stream failed. Please try again.' })}\n\n`);
      res.end();
    }
  } finally {
    activeRequests.delete(requestId);
  }
};

/**
 * POST /api/ai/eligibility
 * Check voter eligibility by age and state.
 */
const checkEligibility = async (req, res, next) => {
  try {
    const { age, state } = req.body;
    const uid = req.user?.uid || 'anon';

    const prompt = buildEligibilityPrompt(age, state);
    const result = await generateResponse(req.env, prompt, 'eligibility', { uid });

    return apiResponse.success(res, {
      eligible: parseInt(age, 10) >= 18,
      details: result.text,
      fallback: result.fallback || false,
    });
  } catch (err) {
    // buildEligibilityPrompt throws on invalid state — return as 400
    if (err.message.startsWith('Invalid')) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
    return next(err);
  }
};

// ── Validation ────────────────────────────────────────────────────────────────

const chatValidation = [
  body('question').trim().notEmpty().withMessage('Question is required').isLength({ max: 500 }).withMessage('Question too long'),
  body('language').optional().isString().isIn(['English', 'Hindi', 'Tamil']),
  body('context').optional().isObject(),
  body('context.state').optional().isString().trim(),
  body('context.age').optional().isInt({ min: 18, max: 120 }),
];

const eligibilityValidation = [
  body('age').isInt({ min: 1, max: 120 }).withMessage('Valid age is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
];

module.exports = { chat, chatStream, checkEligibility, chatValidation, eligibilityValidation };
