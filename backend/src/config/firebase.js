'use strict';

const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db = null;

/**
 * Initializes Firebase Admin SDK using service account credentials.
 * Returns existing instance if already initialized.
 */
const initFirebase = (env) => {
  if (admin.apps.length) {
    return admin.firestore();
  }

  admin.initializeApp({
    credential: admin.credential.cert(env.GOOGLE_APPLICATION_CREDENTIALS),
    projectId: env.FIREBASE_PROJECT_ID,
  });

  db = admin.firestore();
  logger.info('Firebase Admin SDK initialized');
  return db;
};

/**
 * Returns the Firestore database instance.
 * Throws if not yet initialized.
 */
const getDb = () => {
  if (!db) {
    throw new Error('Firestore not initialized. Call initFirebase first.');
  }
  return db;
};

module.exports = { initFirebase, getDb };
