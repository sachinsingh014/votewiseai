/**
 * Analytics Event Schema — VoteWise AI
 * 
 * Naming convention: [Category]_[Action]_[Label]
 * All events are versioned. If the schema changes, bump SCHEMA_VERSION.
 * This version is included in every event so dashboards never silently break.
 * 
 * Consent-first: no event fires unless analyticsConsent === true.
 */

const SCHEMA_VERSION = '1.0.0';

/** Returns true if the user has granted analytics consent */
const isConsentGranted = () => {
  try {
    return JSON.parse(localStorage.getItem('vw_analytics_consent')) === true;
  } catch {
    return false;
  }
};

/**
 * Core event dispatcher.
 * Enriches every event with schema version and timestamp.
 * In production, this would call firebase.logEvent() or Segment.track().
 */
const track = (eventName, properties = {}) => {
  if (!isConsentGranted()) return;

  const payload = {
    event: eventName,
    schema_version: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    ...properties,
  };

  // Development: log to console for inspection — never fires in production
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[Analytics]', payload);
  }

  // Production: fire to GA4 if analytics is initialized
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_ANALYTICS) {
    import('./firebase').then(({ analytics }) => {
      if (analytics) {
        import('firebase/analytics').then(({ logEvent }) => {
          logEvent(analytics, eventName, payload);
        });
      }
    });
  }
};

// ── Typed Event Emitters (Enforced Schema) ────────────────────────────────────

export const Analytics = {
  /** User starts a new AI chat session */
  aiChatStarted: () => track('AI_Session_Started'),

  /** User submits an AI query */
  aiQuerySubmitted: (props = {}) =>
    track('AI_Query_Submitted', {
      has_context: props.hasContext ?? false,
      language: props.language ?? 'English',
    }),

  /** AI response received (streaming complete) */
  aiResponseReceived: (props = {}) =>
    track('AI_Response_Received', {
      from_cache: props.fromCache ?? false,
      latency_ms: props.latencyMs ?? null,
    }),

  /** AI rate limit hit */
  aiRateLimitHit: () => track('AI_RateLimit_Hit'),

  /** User completes a journey step */
  journeyStepCompleted: (props = {}) =>
    track('Journey_Step_Completed', {
      step_id: props.stepId,
      step_title: props.stepTitle ?? null,
    }),

  /** User views the dashboard */
  dashboardViewed: () => track('Dashboard_Viewed'),

  /** User signs up */
  userSignedUp: () => track('Auth_SignUp_Success'),

  /** User signs in */
  userSignedIn: () => track('Auth_SignIn_Success'),

  /** User grants analytics consent */
  consentGranted: () => track('Privacy_Consent_Granted'),

  /** User denies analytics consent */
  consentDenied: () => {
    // Privacy_Consent_Denied is intentionally not tracked via Firebase Analytics.
    // This is a privacy-safe local-only count — no network request, no PII.
    // In production, increment a privacy-safe counter in a server-side aggregator.
  },
};
