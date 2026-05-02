/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UIContext = createContext(null);

/**
 * Unified UI State Manager.
 * Handles global offline status, unified toast/error orchestration,
 * and user privacy preferences (analytics consent).
 */
export function UIProvider({ children }) {
  // ── Network State ──────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Privacy & Consent State ────────────────────────────────────────────────
  const [analyticsConsent, setAnalyticsConsent] = useState(() => {
    // Read from localStorage on boot
    const stored = localStorage.getItem('vw_analytics_consent');
    return stored ? JSON.parse(stored) : null; // null = undedided (show banner)
  });

  const updateConsent = useCallback((granted) => {
    setAnalyticsConsent(granted);
    localStorage.setItem('vw_analytics_consent', JSON.stringify(granted));
    
    // In a real app, this would dynamically import and initialize or disable
    // Firebase Analytics based on the 'granted' boolean.
    if (granted) {
      console.log('Analytics initialized.');
    } else {
      console.log('Analytics disabled. Tracking stopped.');
    }
  }, []);

  // ── Centralized Error State ────────────────────────────────────────────────
  // Instead of scattered toasts, we maintain an active error queue.
  const [activeErrors, setActiveErrors] = useState([]);

  const reportError = useCallback((error, context = 'global') => {
    console.error(`[${context}]`, error);
    
    // Deduplication logic: prevents spamming the exact same message
    setActiveErrors((prev) => {
      const msg = error.message || String(error);
      if (prev.some((e) => e.message === msg)) return prev;
      return [...prev, { id: Date.now(), message: msg, context }];
    });
  }, []);

  const clearError = useCallback((id) => {
    setActiveErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <UIContext.Provider
      value={{
        isOffline,
        analyticsConsent,
        updateConsent,
        activeErrors,
        reportError,
        clearError,
      }}
    >
      {/* Offline Banner injected universally */}
      {isOffline && (
        <div className="bg-red-500 text-white text-sm font-medium text-center py-1.5 px-4 sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md" role="alert">
          <span className="material-symbols-outlined text-[18px]">wifi_off</span>
          You are currently offline. Some features are disabled.
        </div>
      )}
      
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
