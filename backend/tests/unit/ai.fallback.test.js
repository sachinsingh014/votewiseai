'use strict';

const { getFallback, FALLBACKS } = require('../../src/services/ai/ai.fallback');

describe('ai.fallback', () => {
  it('returns the eligibility fallback for "eligibility" intent', () => {
    expect(getFallback('eligibility')).toBe(FALLBACKS.eligibility);
  });

  it('returns the process fallback for "process" intent', () => {
    expect(getFallback('process')).toBe(FALLBACKS.process);
  });

  it('returns the timeline fallback for "timeline" intent', () => {
    expect(getFallback('timeline')).toBe(FALLBACKS.timeline);
  });

  it('returns the guide fallback for "guide" intent', () => {
    expect(getFallback('guide')).toBe(FALLBACKS.guide);
  });

  it('returns the default fallback for an unknown intent', () => {
    expect(getFallback('unknown_xyz')).toBe(FALLBACKS.default);
  });

  it('returns the default fallback when no intent is provided', () => {
    expect(getFallback()).toBe(FALLBACKS.default);
  });

  it('performs case-insensitive matching (e.g. "ELIGIBILITY")', () => {
    expect(getFallback('ELIGIBILITY')).toBe(FALLBACKS.eligibility);
  });

  it('matches partial intent strings (e.g. "guide_first_time")', () => {
    // "guide_first_time" contains "guide" so it should match the guide fallback
    expect(getFallback('guide_first_time')).toBe(FALLBACKS.guide);
  });

  it('all fallback responses contain a reference to eci.gov.in', () => {
    // The Election Commission source should be cited in every fallback
    Object.values(FALLBACKS).forEach((text) => {
      expect(text).toContain('eci.gov.in');
    });
  });
});
