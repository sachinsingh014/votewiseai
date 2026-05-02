'use strict';

const { GoogleAuth } = require('google-auth-library');
const logger = require('../../utils/logger');
const { getCached, setCached } = require('./ai.cache');
const { getFallback } = require('./ai.fallback');
const { moderateOutput } = require('./ai.moderator');

// ── Gemini safety configuration ──────────────────────────────────────────────
// Passed with every request. BLOCK_MEDIUM_AND_ABOVE is the strict production
// setting — it will block more edge cases than LOW_AND_ABOVE.
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

// ── Auth Token ────────────────────────────────────────────────────────────────

const getAuthToken = async (keyFilename) => {
  // On Cloud Run: no keyFilename needed — uses the attached service account (ADC).
  // Locally: keyFilename is set via GOOGLE_APPLICATION_CREDENTIALS in .env.
  const authConfig = {
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  };
  if (keyFilename) {
    authConfig.keyFilename = keyFilename;
  }
  const auth = new GoogleAuth(authConfig);
  return auth.getAccessToken();
};

// ── URL Builders ──────────────────────────────────────────────────────────────

const buildUrl = (project, location, model, stream = false) => {
  const action = stream ? 'streamGenerateContent' : 'generateContent';
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:${action}`;
};

/**
 * Builds the Gemini request body.
 * System instruction is passed separately — NEVER concatenated with user content.
 */
const buildBody = (prompt) => ({
  systemInstruction: { parts: [{ text: prompt.system }] },
  contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
  safetySettings: SAFETY_SETTINGS,
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.2,        // Low temperature = more factual, less creative
    topP: 0.8,
  },
});

// ── Standard (Non-Streaming) Call ─────────────────────────────────────────────

const callGemini = async (env, prompt) => {
  const token = await getAuthToken(env.GOOGLE_APPLICATION_CREDENTIALS);
  const url = buildUrl(env.GOOGLE_CLOUD_PROJECT_ID, env.GOOGLE_CLOUD_LOCATION, env.VERTEX_AI_MODEL, false);
  const body = buildBody(prompt);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Vertex AI error: ${res.status}`);
  }

  const data = await res.json();

  try {
    return data.candidates[0].content.parts[0].text || '';
  } catch {
    throw new Error('Unexpected Gemini response structure');
  }
};

// ── Streaming Call ────────────────────────────────────────────────────────────

/**
 * Calls Gemini with streaming enabled and pipes chunks to an Express response.
 *
 * Backpressure strategy:
 * - Checks res.writableEnded before each write — stops if the client disconnected.
 * - AbortController is passed in so callers can cancel on client disconnect.
 *
 * Reconnection / partial recovery strategy:
 * - A requestId is generated per-stream and passed back to the client.
 * - If the client sends that requestId on a retry, the fully-completed
 *   response is served from cache (set after the stream finishes).
 *
 * @param {object} env
 * @param {object} prompt
 * @param {string} intent
 * @param {import('http').ServerResponse} res - Express response object
 * @param {AbortController} controller
 * @param {string} requestId - Unique ID for this stream session
 */
const streamGemini = async (env, prompt, intent, res, controller, requestId) => {
  const token = await getAuthToken(env.GOOGLE_APPLICATION_CREDENTIALS);
  const url = buildUrl(env.GOOGLE_CLOUD_PROJECT_ID, env.GOOGLE_CLOUD_LOCATION, env.VERTEX_AI_MODEL, true);
  const body = buildBody(prompt);

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Vertex AI stream error: ${upstream.status}`);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let rawBuffer = ''; // Accumulates full JSON array across chunks

  // SSE headers — sent before we start reading
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx passthrough
  res.flushHeaders();

  try {
    // Phase 1: Collect all raw bytes from Vertex AI
    // The stream sends a JSON array split across multiple chunks:
    //   Chunk 1: '[{\n  "candidates": [...]\n}\n'
    //   Chunk 2: ']'
    while (true) {
      if (res.writableEnded) { break; }
      const { done, value } = await reader.read();
      if (done) { break; }
      rawBuffer += decoder.decode(value, { stream: true });
    }

    // Phase 2: Parse the complete JSON array and extract all text
    if (rawBuffer.trim()) {
      try {
        // Vertex AI wraps response in a JSON array: [{ candidates: [...] }, ...]
        const parsed = JSON.parse(rawBuffer.trim());
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of items) {
          const text = item?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            accumulated += text;
            // Stream each item's text as an SSE chunk
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }
        }
      } catch (parseErr) {
        logger.warn({ event: 'stream_parse_failed', error: parseErr.message, rawLength: rawBuffer.length });
      }
    }
  } finally {
    reader.cancel();
  }

  // After stream ends: run full moderation on accumulated response
  const modResult = moderateOutput(accumulated, intent);
  if (!modResult.safe) {
    // Send corrected text as final event
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ text: modResult.text, corrected: true })}\n\n`);
    }
    accumulated = modResult.text;
  }

  // Cache the completed response for reconnection recovery
  const hasContext = prompt.user.includes('<voter_context>');
  setCached(intent, prompt.user, accumulated, hasContext, prompt.version);

  // Send completion sentinel
  if (!res.writableEnded) {
    res.write(`data: [DONE]\n\n`);
    res.write(`data: ${JSON.stringify({ requestId, done: true })}\n\n`);
    res.end();
  }
};

// ── Main Orchestrator ─────────────────────────────────────────────────────────

/**
 * Orchestrates AI response generation.
 * Flow: Cache check → Gemini → Secondary moderation → Cache write → Return
 *
 * Telemetry: Logs latency, token intent, cache status, and moderation flags.
 *
 * @param {object} env
 * @param {object} prompt
 * @param {string} intent
 * @param {object|null} options - { uid } for telemetry
 */
const generateResponse = async (env, prompt, intent = 'default', options = {}) => {
  const start = Date.now();
  const hasContext = prompt.user.includes('<voter_context>');

  // Cache check
  const cached = getCached(intent, prompt.user, prompt.version);
  if (cached) {
    logger.info({ event: 'ai_cache_hit', intent, uid: options.uid || 'anon', latency_ms: Date.now() - start });
    return { text: cached, fromCache: true };
  }

  try {
    const text = await callGemini(env, prompt);

    // Secondary moderation layer
    const modResult = moderateOutput(text, intent);

    const latency = Date.now() - start;

    // Structured AI telemetry log
    logger.info({
      event: 'ai_response_generated',
      intent,
      uid: options.uid || 'anon',
      latency_ms: latency,
      from_cache: false,
      flagged: modResult.flagged ?? false,
      blocked: !modResult.safe,
      prompt_version: prompt.version,
    });

    // Cache the (possibly moderated) text
    setCached(intent, prompt.user, modResult.text, hasContext, prompt.version);

    return { text: modResult.text, fromCache: false, flagged: modResult.flagged ?? false };
  } catch (err) {
    logger.error({
      event: 'ai_error',
      intent,
      uid: options.uid || 'anon',
      error: err.message,
      latency_ms: Date.now() - start,
    });
    return { text: getFallback(intent), fromCache: false, fallback: true };
  }
};

module.exports = { generateResponse, streamGemini };
