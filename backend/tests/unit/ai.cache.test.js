'use strict';

const { getCached, setCached, invalidateIntent } = require('../../src/services/ai/ai.cache');

describe('ai.cache', () => {
  // ── Cache Miss ────────────────────────────────────────────────────────────
  describe('getCached', () => {
    it('returns null on a cache miss', () => {
      const result = getCached('chat', 'this question was never asked', '1.0.0');
      expect(result).toBeNull();
    });

    it('returns null for a different intent with the same prompt', () => {
      setCached('chat', 'shared prompt', 'my answer', false, '1.0.0');
      const result = getCached('eligibility', 'shared prompt', '1.0.0');
      expect(result).toBeNull();
    });

    it('returns null for a different prompt version (rollback isolation)', () => {
      setCached('chat', 'same prompt', 'cached response v1', false, '1.0.0');
      const result = getCached('chat', 'same prompt', '2.0.0'); // different version
      expect(result).toBeNull();
    });
  });

  // ── Cache Hit ─────────────────────────────────────────────────────────────
  describe('setCached + getCached', () => {
    it('stores a value and retrieves it on the next call (cache hit)', () => {
      const prompt = 'What is the voting age in India?';
      const response = 'The minimum voting age in India is 18 years.';

      setCached('chat', prompt, response, false, '1.0.0');
      const hit = getCached('chat', prompt, '1.0.0');

      expect(hit).toBe(response);
    });

    it('stores different values per intent independently', () => {
      setCached('eligibility', 'unique prompt', 'eligibility answer', false, '1.0.0');
      setCached('guide', 'unique prompt', 'guide answer', false, '1.0.0');

      expect(getCached('eligibility', 'unique prompt', '1.0.0')).toBe('eligibility answer');
      expect(getCached('guide', 'unique prompt', '1.0.0')).toBe('guide answer');
    });

    it('returns the same value for identical inputs (deterministic key)', () => {
      const prompt = 'Deterministic key test prompt';
      setCached('chat', prompt, 'deterministic response', false, '1.0.0');

      const hit1 = getCached('chat', prompt, '1.0.0');
      const hit2 = getCached('chat', prompt, '1.0.0');

      expect(hit1).toBe('deterministic response');
      expect(hit2).toBe('deterministic response');
    });

    it('uses a shorter TTL for context-bearing prompts without throwing', () => {
      // This exercises the resolveTtl branch for chat + hasContext=true
      // We can't directly assert TTL, but we can confirm it stores without error
      expect(() => {
        setCached('chat', 'personalized prompt', 'personalized answer', true, '1.0.0');
      }).not.toThrow();
      expect(getCached('chat', 'personalized prompt', '1.0.0')).toBe('personalized answer');
    });
  });

  // ── Invalidation ──────────────────────────────────────────────────────────
  describe('invalidateIntent', () => {
    it('does not throw when called with a valid intent', () => {
      expect(() => invalidateIntent('chat')).not.toThrow();
    });

    it('does not throw when called with an unknown intent', () => {
      expect(() => invalidateIntent('unknown_intent')).not.toThrow();
    });
  });
});
