import { useUI } from '../context/UIContext';

/**
 * Consent banner that respects the user's explicit choice.
 * If consent is undefined, it renders a bottom sheet to ask for permission.
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
