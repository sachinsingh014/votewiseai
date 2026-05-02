'use strict';

// ── Mock all external dependencies before requiring the service ──────────────
jest.mock('../../src/services/ai/ai.cache');
jest.mock('../../src/services/ai/ai.fallback');
jest.mock('../../src/services/ai/ai.moderator');
jest.mock('google-auth-library');

const { getCached, setCached } = require('../../src/services/ai/ai.cache');
const { getFallback } = require('../../src/services/ai/ai.fallback');
const { moderateOutput } = require('../../src/services/ai/ai.moderator');
const { generateResponse } = require('../../src/services/ai/ai.service');

// A valid mock prompt object
const mockPrompt = {
  system: 'You are VoteWise AI.',
  user:   'What is the voting age?',
  version: '3.0.0',
};

const mockEnv = {
  GOOGLE_APPLICATION_CREDENTIALS: './credentials/fake.json',
  GOOGLE_CLOUD_PROJECT_ID:        'test-project',
  GOOGLE_CLOUD_LOCATION:          'us-central1',
  VERTEX_AI_MODEL:                'gemini-2.5-flash',
};

describe('ai.service — generateResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: cache miss
    getCached.mockReturnValue(null);
    // Default: moderation passes
    moderateOutput.mockReturnValue({ safe: true, text: 'Voting age is 18.', flagged: false });
  });

  // ── Cache Hit Path ─────────────────────────────────────────────────────────
  it('returns cached response and sets fromCache=true without calling Gemini', async () => {
    getCached.mockReturnValue('Cached: Voting age is 18.');

    const result = await generateResponse(mockEnv, mockPrompt, 'chat', { uid: 'user1' });

    expect(result.fromCache).toBe(true);
    expect(result.text).toBe('Cached: Voting age is 18.');
    // setCached should NOT be called on a cache hit
    expect(setCached).not.toHaveBeenCalled();
  });

  // ── Gemini Success Path ────────────────────────────────────────────────────
  it('calls Gemini, moderates output, caches result, and returns fromCache=false on success', async () => {
    // Mock global fetch for the Gemini API call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'Voting age is 18.' }] } }],
      }),
    });

    // Auth mock
    const { GoogleAuth } = require('google-auth-library');
    GoogleAuth.mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue('fake-token'),
    }));

    const result = await generateResponse(mockEnv, mockPrompt, 'chat', { uid: 'user1' });

    expect(result.fromCache).toBe(false);
    expect(result.text).toBe('Voting age is 18.');
    expect(result.fallback).toBeUndefined();
    expect(setCached).toHaveBeenCalledTimes(1);
  });

  // ── Fallback Path (Gemini API Error) ──────────────────────────────────────
  it('returns fallback response when Gemini fetch throws an error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    getFallback.mockReturnValue('Fallback: Please visit eci.gov.in.');

    const { GoogleAuth } = require('google-auth-library');
    GoogleAuth.mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue('fake-token'),
    }));

    const result = await generateResponse(mockEnv, mockPrompt, 'chat', { uid: 'user1' });

    expect(result.fallback).toBe(true);
    expect(result.fromCache).toBe(false);
    expect(result.text).toBe('Fallback: Please visit eci.gov.in.');
    expect(getFallback).toHaveBeenCalledWith('chat');
  });

  // ── Fallback Path (Non-OK Gemini Response) ────────────────────────────────
  it('returns fallback response when Gemini returns a non-200 status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({ error: { message: 'Service unavailable' } }),
    });
    getFallback.mockReturnValue('Fallback: eci.gov.in');

    const { GoogleAuth } = require('google-auth-library');
    GoogleAuth.mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue('fake-token'),
    }));

    const result = await generateResponse(mockEnv, mockPrompt, 'chat');

    expect(result.fallback).toBe(true);
  });

  // ── Moderation Flagging Path ───────────────────────────────────────────────
  it('returns moderated text and flagged=true when output is flagged', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'Problematic content here.' }] } }],
      }),
    });
    moderateOutput.mockReturnValue({ safe: false, text: 'Corrected safe text.', flagged: true });

    const { GoogleAuth } = require('google-auth-library');
    GoogleAuth.mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue('fake-token'),
    }));

    const result = await generateResponse(mockEnv, mockPrompt, 'chat');

    expect(result.flagged).toBe(true);
    expect(result.text).toBe('Corrected safe text.');
  });

  // ── Unexpected Response Structure ─────────────────────────────────────────
  it('returns fallback when Gemini response has an unexpected structure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ totally_unexpected: true }),
    });
    getFallback.mockReturnValue('Fallback eci.gov.in');

    const { GoogleAuth } = require('google-auth-library');
    GoogleAuth.mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue('fake-token'),
    }));

    const result = await generateResponse(mockEnv, mockPrompt, 'chat');
    expect(result.fallback).toBe(true);
  });
});

describe('ai.service — streamGemini', () => {
  const { streamGemini } = require('../../src/services/ai/ai.service');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles stream correctly', async () => {
    // Mock response stream
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('[{"candidates": [{"content": {"parts": [{"text": "Hello stream"}]}}]}]') })
        .mockResolvedValueOnce({ done: true }),
      cancel: jest.fn(),
    };
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { GoogleAuth } = require('google-auth-library');
    GoogleAuth.mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue('fake-token'),
    }));

    const mockRes = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      writableEnded: false,
    };

    moderateOutput.mockReturnValue({ safe: true, text: 'Hello stream', flagged: false });

    await streamGemini(mockEnv, mockPrompt, 'chat', mockRes, { signal: null }, 'req-123');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('Hello stream'));
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('handles stream upstream error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ error: { message: 'Stream failed' } }),
    });

    const mockRes = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      writableEnded: false,
    };

    await expect(streamGemini(mockEnv, mockPrompt, 'chat', mockRes, { signal: null }, 'req-123')).rejects.toThrow('Stream failed');
  });
});
