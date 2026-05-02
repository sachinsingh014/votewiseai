'use strict';

/**
 * Pre-written fallback responses for when Gemini is unavailable.
 * Keyed by intent type to ensure graceful degradation.
 */
const FALLBACKS = {
  eligibility: 'To vote in India, you must be a citizen aged 18 or older and registered on the electoral roll. Please check the official Election Commission website (eci.gov.in) for the most accurate information.',
  process: 'The voting process involves: 1. Verifying your name on the voter list. 2. Going to your designated polling booth with valid ID. 3. Getting your finger marked with indelible ink. 4. Casting your vote on the EVM. Visit eci.gov.in for more details.',
  timeline: 'Election timelines are announced by the Election Commission of India. For the latest schedule, please visit eci.gov.in.',
  guide: 'Step 1: Check your voter registration at voterportal.eci.gov.in. Step 2: Find your polling booth. Step 3: Bring a valid photo ID on election day. Step 4: Cast your vote at your designated booth.',
  default: 'I apologize, but I am temporarily unable to answer your question. Please visit the Election Commission of India website at eci.gov.in for authoritative information about elections.',
};

/**
 * Returns an appropriate fallback response based on detected intent.
 */
const getFallback = (intent = 'default') => {
  const key = Object.keys(FALLBACKS).find((k) => intent.toLowerCase().includes(k));
  return FALLBACKS[key] || FALLBACKS.default;
};

module.exports = { getFallback, FALLBACKS };
