import PropTypes from 'prop-types';
import { useUI } from '../context/UIContext';

/**
 * @fileoverview Privacy consent banner for VoteWise AI.
 * @module components/PrivacyBanner
 *
 * Renders a bottom-sheet consent dialog if the user hasn't yet decided on
 * analytics tracking. Disappears automatically once a choice is recorded
 * in localStorage via the UIContext updateConsent function.
 */

/**
 * Consent banner that respects the user's explicit choice.
 * Renders null immediately if consent has already been granted or denied.
 * If consent is null (undecided), renders a fixed bottom sheet asking for permission.
 *
 * ACCESSIBILITY: Includes role="region" and aria-label for screen reader announcement.
 * PRIVACY: No analytics event fires until updateConsent(true) is explicitly called.
 *
 * @returns {JSX.Element|null} The consent banner, or null if consent is already decided
 */
export default function PrivacyBanner() {
  const { analyticsConsent, updateConsent } = useUI();

  // If the user has already made a choice (true or false), don't show the banner.
  if (analyticsConsent !== null) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 md:p-6 z-50 flex flex-col md:flex-row items-center gap-4 justify-between shadow-2xl animate-fade-in-up"
      role="region"
      aria-label="Privacy and analytics consent"
    >
      <div className="flex items-start gap-3 flex-1 text-slate-200 text-sm">
        <span className="material-symbols-outlined text-orange-400 mt-0.5" aria-hidden="true">policy</span>
        <p className="leading-relaxed">
          VoteWise AI uses strictly anonymous analytics to understand how people interact with the platform and improve our civic education tools.
          We do <strong className="text-white">not</strong> sell data or track personal identities. Do you consent to anonymous tracking?
        </p>
      </div>
      <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
        <button
          onClick={() => updateConsent(false)}
          aria-label="Decline analytics tracking"
          className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border-2 border-slate-500 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
        >
          Decline
        </button>
        <button
          onClick={() => updateConsent(true)}
          aria-label="Accept anonymous analytics tracking"
          className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors shadow-lg"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

PrivacyBanner.propTypes = {};
