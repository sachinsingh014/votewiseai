/**
 * @fileoverview Firebase initialization and service exports for VoteWise AI frontend.
 * @module services/firebase
 *
 * Initializes the Firebase app with environment-provided configuration and exports
 * pre-built service instances (Auth, Firestore, Analytics) for use across the app.
 *
 * Analytics is lazily initialized because it may not be supported in all browser
 * environments (ad-blocked, SSR, WebViews, etc.).
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

/**
 * @typedef {Object} FirebaseConfig
 * @property {string} apiKey - Firebase Web API key
 * @property {string} authDomain - Firebase Auth domain
 * @property {string} projectId - Google Cloud project ID
 * @property {string} storageBucket - Firebase Storage bucket URL
 * @property {string} messagingSenderId - Firebase Cloud Messaging sender ID
 * @property {string} appId - Firebase App registration ID
 */

/**
 * Firebase configuration object populated from Vite environment variables.
 * All values are injected at build time — never hard-coded in source.
 * @type {FirebaseConfig}
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** @type {import('firebase/app').FirebaseApp} Initialized Firebase application instance */
const app = initializeApp(firebaseConfig);

/** @type {import('firebase/auth').Auth} Firebase Authentication service instance */
export const auth = getAuth(app);

/** @type {import('firebase/firestore').Firestore} Firebase Firestore database instance */
export const db = getFirestore(app);

/**
 * Firebase Analytics instance — initialized lazily to handle environments where
 * analytics is blocked (ad-blockers, server-side rendering, restricted WebViews).
 * Will be null until the async isSupported() check resolves.
 * @type {import('firebase/analytics').Analytics|null}
 */
let analytics = null;
isSupported().then((isAnalyticsSupported) => {
  if (isAnalyticsSupported) {
    analytics = getAnalytics(app);
  }
});
export { analytics };

export default app;
