'use strict';

require('dotenv').config();
const validateEnv = require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('./middleware/sanitize');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter, aiLimiter } = require('./middleware/rateLimiter');
const { initFirebase } = require('./config/firebase');
const routes = require('./routes');
const logger = require('./utils/logger');
const { aiStats } = require('./services/ai/ai.service');

const createApp = (env) => {
  const app = express();

  // ── Security Layer 1: Helmet — HTTP security headers ──────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
  }));
  // Permissions-Policy header
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });
  // ── Security Layer 2: NoSQL injection prevention ────────────────────
  app.use(mongoSanitize());

  // CORS — supports dynamic wildcard/regex (Fixes #4)
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => {
    const trimmed = o.trim();
    // If it's a regex string (e.g. /^https:\/\/.*\.web\.app$/), parse it
    if (trimmed.startsWith('/') && trimmed.endsWith('/')) {
      return new RegExp(trimmed.slice(1, -1));
    }
    return trimmed;
  });
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  // Liveness Probe: "Is the Node process running?" (Fast, no dependencies)
  app.get('/api/health/liveness', (req, res) => res.status(200).send('OK'));

  // Readiness Probe: "Is it safe to route traffic here?" (Checks dependencies)
  app.get('/api/health/readiness', async (req, res) => {
    const dependencies = { firestore: 'up', gemini: 'up' };
    const security = {
      helmet: true,
      rateLimiting: true,
      mongoSanitize: true,
      firebaseAuth: true,
      corsPolicy: true,
    };
    let isHealthy = true;

    try {
      const admin = require('firebase-admin');
      await admin.firestore().collection('_system_health').doc('ping').get();
    } catch (err) {
      dependencies.firestore = `down: ${err.message}`;
      isHealthy = false;
    }

    try {
      if (!process.env.GEMINI_API_KEY) { throw new Error('GEMINI_API_KEY is missing'); }
      const { GoogleGenAI } = require('@google/genai');
      new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      dependencies.gemini = `down: ${err.message}`;
      isHealthy = false;
    }

    if (isHealthy) {
      return res.status(200).json({ status: 'ready', dependencies, aiStats: aiStats.getSnapshot(), security, timestamp: new Date().toISOString() });
    }
    logger.error({ message: 'Readiness probe failed', dependencies });
    return res.status(503).json({ status: 'unavailable', dependencies, aiStats: aiStats.getSnapshot(), security, timestamp: new Date().toISOString() });
  });

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false }));

  // Request logging
  app.use(requestLogger);

  // Rate limiting — attach env to req for controllers
  app.use(generalLimiter(env));
  app.use((req, _res, next) => { req.env = env; next(); });

  // Stricter rate limit on AI routes
  app.use('/api/ai', aiLimiter(env));
  app.use('/api/journey', aiLimiter(env));

  // API routes
  app.use('/api', routes);

  // 404 and error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const start = async () => {
  const env = validateEnv();
  initFirebase(env);
  const app = createApp(env);
  const port = env.PORT;

  const server = app.listen(port, () => {
    logger.info({ message: `VoteWise AI backend running`, port, env: env.NODE_ENV });
  });

  /**
   * Graceful shutdown handler.
   * On SIGTERM/SIGINT: stop accepting connections, let in-flight requests finish,
   * then exit cleanly. This prevents abrupt stream termination.
   */
  const shutdown = (signal) => {
    logger.info({ message: `${signal} received — initiating graceful shutdown` });
    server.close(() => {
      logger.info({ message: 'All connections closed — process exiting cleanly' });
      process.exit(0);
    });
    // Force exit after 5 seconds if connections hang
    setTimeout(() => {
      logger.warn({ message: 'Graceful shutdown timeout — forcing exit' });
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { createApp };
