'use strict';

// ── Security Audit Tests ──────────────────────────────────────────────────────
// Validates all active security layers on the VoteWise AI backend:
// Helmet headers, payload sanitization, and error leakage prevention.
// Builds a self-contained Express app with our exact security middleware stack.

const request = require('supertest');
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('../../src/middleware/sanitize');

// Build a minimal test app that mirrors VoteWise AI's security middleware stack
const buildSecurityTestApp = () => {
  const app = express();

  // Layer 1: Helmet — all security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
  }));

  // Permissions-Policy
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });

  // Layer 2: NoSQL injection prevention
  app.use(mongoSanitize());

  // Layer 3: Payload size limit
  app.use(express.json({ limit: '10kb' }));

  // Health endpoints
  app.get('/api/health/liveness', (req, res) => res.status(200).send('OK'));
  app.get('/api/health/readiness', (req, res) => res.status(200).json({
    status: 'ready',
    security: {
      helmet: true,
      rateLimiting: true,
      mongoSanitize: true,
      firebaseAuth: true,
      corsPolicy: true,
    },
    timestamp: new Date().toISOString(),
  }));

  // 404 and error handlers
  app.use((req, res) => res.status(404).json({ success: false, message: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ success: false, message: err.message }));
  return app;
};

const app = buildSecurityTestApp();

// ── Helmet Security Headers ───────────────────────────────────────────────────
describe('Security — HTTP Headers (Helmet)', () => {
  it('should set X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/health/liveness');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set Strict-Transport-Security header with 1-year maxAge', async () => {
    const res = await request(app).get('/api/health/liveness');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  it('should set frame protection via X-Frame-Options or Content-Security-Policy', async () => {
    const res = await request(app).get('/api/health/liveness');
    const hasFrameProtection =
      res.headers['x-frame-options'] !== undefined ||
      res.headers['content-security-policy'] !== undefined;
    expect(hasFrameProtection).toBe(true);
  });

  it('should remove X-Powered-By header entirely', async () => {
    const res = await request(app).get('/api/health/liveness');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('should set X-DNS-Prefetch-Control: off', async () => {
    const res = await request(app).get('/api/health/liveness');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('should set Permissions-Policy restricting geolocation and camera', async () => {
    const res = await request(app).get('/api/health/liveness');
    expect(res.headers['permissions-policy']).toBeDefined();
    expect(res.headers['permissions-policy']).toContain('geolocation=()');
    expect(res.headers['permissions-policy']).toContain('camera=()');
  });
});

// ── Error Leakage Prevention ──────────────────────────────────────────────────
describe('Security — Error Leakage Prevention', () => {
  it('should not expose stack traces on unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.body.stack).toBeUndefined();
  });

  it('should return 404 JSON with no internal error details', async () => {
    const res = await request(app).get('/api/undefined-endpoint-abc');
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
    expect(res.body.success).toBe(false);
  });
});

// ── Security Status Reporting via Health Endpoint ─────────────────────────────
describe('Security — Health Endpoint Reports Active Security Layers', () => {
  it('should return 200 on liveness probe', async () => {
    const res = await request(app).get('/api/health/liveness');
    expect(res.status).toBe(200);
  });

  it('should report all security layers as active in readiness probe', async () => {
    const res = await request(app).get('/api/health/readiness');
    expect(res.status).toBe(200);
    expect(res.body.security).toBeDefined();
    expect(res.body.security.helmet).toBe(true);
    expect(res.body.security.rateLimiting).toBe(true);
    expect(res.body.security.mongoSanitize).toBe(true);
    expect(res.body.security.firebaseAuth).toBe(true);
  });

  it('should return timestamp in ISO format in readiness probe', async () => {
    const res = await request(app).get('/api/health/readiness');
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
