'use strict';

/**
 * @fileoverview AI Controller — handles all AI-powered civic assistant endpoints.
 * @module controllers/ai
 * @requires express-validator
 * @requires crypto
 * @requires services/ai/ai.service
 * @requires services/ai/ai.prompt
 * @requires services/ai/ai.cache
 * @requires utils/apiResponse
 * @requires utils/logger
 */

const { body } = require('express-validator');
const crypto = require('crypto');
const { generateResponse, streamGemini } = require('../services/ai/ai.service');
const { buildChatPrompt, buildEligibilityPrompt } = require('../services/ai/ai.prompt');
const { getCached } = require('../services/ai/ai.cache');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Tracks active SSE request IDs to enforce idempotency and prevent duplicate
 * concurrent generations for the same client session.
 * Cleared automatically when a stream finishes or the client disconnects.
 * @type {Set<string>}
 */
const activeRequests = new Set();

/**
 * POST /api/ai/chat
 * Standard (non-streaming) Q&A endpoint — used as fallback when client doesn't support SSE.
 * Accepts optional voter context for personalized answers about Indian elections.
 *
 * SECURITY: Protected by Firebase ID token authentication.
 * PERFORMANCE: Responses are cached by prompt hash to avoid redundant Gemini calls.
 *
 * @param {import('express').Request} req - Express request object
 * @param {string} req.body.question - The civic question to answer (max 500 chars)
 * @param {string} [req.body.language='English'] - Response language: English | Hindi | Tamil
 * @param {Object|null} [req.body.context=null] - Optional voter context (state, age)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with answer text and metadata
 * @throws {Error} Passes unexpected errors to Express error handler via next()
 *
 * @example
 * // POST /api/ai/chat
 * // Body: { "question": "How do I register to vote?", "language": "English" }
 * // Response: { "success": true, "data": { "answer": "...", "fromCache": false } }
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
 * Sends a cached response immediately over an already-established SSE connection.
 *
 * @param {import('express').Response} res - Express SSE response object
 * @param {string} cached - Cached response text to send
 * @returns {void}
 */
const sendCachedStream = (res, cached) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ text: cached, fromCache: true, done: true })}\n\n`);
  res.end();
};

/**
 * Parses the optional JSON context string from SSE query parameters.
 * Returns null silently on parse failure to avoid breaking the stream.
 *
 * @param {string|undefined} contextStr - Raw JSON string from query param
 * @returns {Object|null} Parsed context object, or null if absent/invalid
 */
const parseStreamContext = (contextStr) => {
  if (!contextStr) {return null;}
  try {
    return JSON.parse(contextStr);
  } catch {
    return null;
  }
};

/**
 * GET /api/ai/chat/stream
 * Server-Sent Events (SSE) streaming endpoint for real-time AI responses.
 *
 * Client sends: question, language, context as URL query parameters.
 * Server responds: SSE stream of JSON chunks `{ text }`, terminated by `[DONE]`.
 *
 * SECURITY: Protected by Firebase ID token. Rate-limited per user (AI limiter).
 * PERFORMANCE:
 *   - Reconnection recovery: if client reconnects with same requestId and cache exists,
 *     the cached response is returned immediately without re-calling Gemini.
 *   - Backpressure: each chunk checks res.writableEnded before writing.
 *   - AbortController cancels the upstream Gemini connection on client disconnect.
 *
 * @param {import('express').Request} req - Express request with SSE query params
 * @param {string} req.query.question - Civic question (max 500 chars)
 * @param {string} [req.query.language='English'] - Response language
 * @param {string} [req.query.requestId] - Client-provided idempotency key for reconnections
 * @param {string} [req.query.context] - JSON-encoded voter context
 * @param {import('express').Response} res - Express SSE response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} SSE stream or JSON error if headers not yet sent
 * @throws {Error} Non-abort errors are logged and sent as SSE error events mid-stream
 */
const chatStream = async (req, res, next) => {
  const { question, language = 'English', requestId: clientRequestId } = req.query;
  const context = parseStreamContext(req.query.context);

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' });
  }
  if (question.length > 500) {
    return res.status(400).json({ error: 'Question too long' });
  }

  const uid = req.user?.uid || 'anon';
  const requestId = clientRequestId || crypto.randomUUID();
  // Extract GCP Cloud Trace Context for structured log correlation
  const traceId = req.headers['x-cloud-trace-context']?.split('/')[0] || requestId;

  // Enforce idempotency: prevent identical in-flight requests for the same client
  if (activeRequests.has(requestId)) {
    return res.status(409).json({ error: 'Duplicate request already in progress.' });
  }

  const prompt = buildChatPrompt(question, language, context);

  // Reconnection recovery: serve cached result immediately if client reconnects
  const cached = getCached('chat', prompt.user, prompt.version);
  if (cached && clientRequestId) {
    sendCachedStream(res, cached);
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
    // AbortError means the client disconnected — nothing more to write
    if (err.name === 'AbortError') { return; }

    logger.error({ event: 'stream_error', uid, requestId, error: err.message });

    // If SSE headers haven't been sent yet, delegate to standard JSON error handler
    if (!res.headersSent) { return next(err); }

    // Mid-stream failure: send error sentinel event and close the connection
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
 * Checks whether a user meets the basic age and state criteria to vote in India.
 * Returns an AI-generated detailed eligibility explanation alongside a boolean result.
 *
 * SECURITY: Protected by Firebase ID token.
 * PERFORMANCE: Responses are cached by prompt hash.
 *
 * @param {import('express').Request} req - Express request object
 * @param {number} req.body.age - Voter's age in years
 * @param {string} req.body.state - Indian state or union territory name
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON with eligible boolean, AI details, and fallback flag
 * @throws {Error} Returns 400 for invalid state; passes other errors to next()
 *
 * @example
 * // POST /api/ai/eligibility
 * // Body: { "age": 22, "state": "Maharashtra" }
 * // Response: { "success": true, "data": { "eligible": true, "details": "..." } }
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
    // buildEligibilityPrompt throws with 'Invalid' prefix for unrecognized states — return 400
    if (err.message.startsWith('Invalid')) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
    return next(err);
  }
};

// ── Input Validation Schemas ───────────────────────────────────────────────────

/**
 * Express-validator chain for the POST /api/ai/chat endpoint.
 * Validates question length, language enum, and optional context shape.
 * @type {import('express-validator').ValidationChain[]}
 */
const chatValidation = [
  body('question').trim().notEmpty().withMessage('Question is required').isLength({ max: 500 }).withMessage('Question too long'),
  body('language').optional().isString().isIn(['English', 'Hindi', 'Tamil']),
  body('context').optional().isObject(),
  body('context.state').optional().isString().trim(),
  body('context.age').optional().isInt({ min: 18, max: 120 }),
];

/**
 * Express-validator chain for the POST /api/ai/eligibility endpoint.
 * Validates that age is a positive integer and state is a non-empty string.
 * @type {import('express-validator').ValidationChain[]}
 */
const eligibilityValidation = [
  body('age').isInt({ min: 1, max: 120 }).withMessage('Valid age is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
];

module.exports = { chat, chatStream, checkEligibility, chatValidation, eligibilityValidation };
