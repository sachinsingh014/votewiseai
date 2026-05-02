import { useUI } from '../context/UIContext';

/**
 * SystemStatus Component
 * 
 * Provides absolute transparency to the user regarding platform health.
 * Reads the active error queue from UIContext. If multiple transient failures
 * or offline events occur, it surfaces a "Degraded" status in the UI.
 */
export default function SystemStatus() {
  const { isOffline, activeErrors } = useUI();

  // Simple heuristic: if we are offline or have > 1 active unhandled error, we are degraded.
  const isDegraded = isOffline || activeErrors.length > 1;

  if (!isDegraded) return null;

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full animate-fade-in-up"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
      </span>
      <span className="text-[11px] font-semibold tracking-wide text-amber-700 uppercase">
        {isOffline ? 'Offline Mode' : 'Degraded Performance'}
      </span>
    </div>
  );
}
