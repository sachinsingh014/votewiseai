'use strict';

const logger = require('../../utils/logger');

/**
 * Secondary, synchronous content moderation layer.
 *
 * This runs AFTER Gemini's built-in safetySettings as a defence-in-depth measure.
 * Gemini's native filters are probabilistic and not fully deterministic.
 * This layer provides a deterministic, rule-based catch for known bad patterns.
 *
 * Philosophy:
 * - We do NOT attempt to replace Gemini's moderation.
 * - We only catch a small set of high-confidence, obvious violations.
 * - We prefer false negatives (missing bad content) over false positives
 *   (blocking legitimate content) — this is a civic education app.
 */

/**
 * Patterns that indicate a response has gone completely off-topic
 * or contains content inappropriate for a civic platform.
 *
 * These are checked case-insensitively against the full response.
 */
const BLOCK_PATTERNS = [
  // Prompt injection detection — if Gemini starts roleplaying as a different AI
  /ignore (all |previous |prior )?(instructions?|prompts?|rules?)/i,
  /you are now a/i,
  /disregard your (system|previous)/i,
  /as (an|a) (unrestricted|unfiltered|jailbroken)/i,
  // Absolute blocks: no electoral AI should produce these
  /\b(kill|murder|assassinate)\b.{0,30}\b(candidate|politician|minister|mp|mla)\b/i,
];

/**
 * Patterns that indicate the response should be flagged with a warning
 * but not blocked entirely.
 */
const WARN_PATTERNS = [
  // Strong partisan language that could indicate bias slippage
  /\b(vote for|support|endorse)\b.{0,20}\b(BJP|Congress|AAP|TMC|SP|BSP|NCP)\b/i,
];

/**
 * Validates AI output before it is sent to the client.
 *
 * @param {string} text - The raw AI response text
 * @param {string} intent - The prompt intent (for logging)
 * @returns {{ safe: boolean, text: string, flagged?: boolean }}
 */
const moderateOutput = (text, intent = 'default') => {
  if (!text || typeof text !== 'string') {
    return { safe: false, text: '' };
  }

  // Block check
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn({
        message: 'AI output blocked by secondary moderation',
        intent,
        pattern: pattern.toString(),
      });
      return {
        safe: false,
        text: 'I was unable to generate a safe response for this query. Please try rephrasing or visit eci.gov.in for authoritative information.',
      };
    }
  }

  // Warn check — we still serve it but log for human review
  for (const pattern of WARN_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn({
        message: 'AI output flagged for review (partisan language)',
        intent,
        pattern: pattern.toString(),
      });
      // Flag it in the log but still serve — avoid over-censoring civic content
      return { safe: true, text, flagged: true };
    }
  }

  return { safe: true, text };
};

module.exports = { moderateOutput };
