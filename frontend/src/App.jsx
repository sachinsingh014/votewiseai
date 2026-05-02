import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider, useUI } from './context/UIContext';
import { ScopedErrorBoundary } from './components/ScopedErrorBoundary';
import PrivacyBanner from './components/PrivacyBanner';
import { DashboardSkeleton, ChatSkeleton, AuthSkeleton } from './components/SkeletonScreens';

// ── Code-Splitting: lazy load all non-critical routes ────────────────────────
// The browser downloads each module only when the user navigates to that route.
const LandingPage     = lazy(() => import('./pages/LandingPage'));
const AuthPage        = lazy(() => import('./pages/AuthPage'));
const ChatInterface   = lazy(() => import('./pages/ChatInterface'));
const Dashboard       = lazy(() => import('./pages/Dashboard'));

// ── Web Vitals Reporting ──────────────────────────────────────────────────────
// Reports Core Web Vitals to the console in dev.
// In production, replace console.debug with your analytics provider.
const reportWebVitals = (metric) => {
  if (import.meta.env.DEV) {
    console.debug(`[WebVitals] ${metric.name}:`, Math.round(metric.value), metric.rating);
  }
  // Production: logEvent(analytics, metric.name, { value: metric.value });
};

onCLS(reportWebVitals);
onINP(reportWebVitals);
onLCP(reportWebVitals);
onFCP(reportWebVitals);
onTTFB(reportWebVitals);

// ── Route Guards ──────────────────────────────────────────────────────────────

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Shows a spinner while Firebase resolves auth state.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pearl-bg flex items-center justify-center font-inter" aria-label="Loading">
        <div className="flex flex-col items-center gap-4">
          <span className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm text-on-surface-variant font-medium">Loading your session…</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

/**
 * PublicRoute — redirects authenticated users away from /login.
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/guide" replace /> : children;
};

// ── Toast-Aware Offline Notifier ──────────────────────────────────────────────
// Watches offline state from UIContext and fires contextual toasts.
function NetworkWatcher() {
  const { isOffline } = useUI();

  useEffect(() => {
    if (isOffline) {
      toast.error('You are offline. Some features are unavailable.', {
        id: 'offline',          // Deduplicated — only one toast ever
        duration: Infinity,     // Stays until dismissed or back online
        icon: '📡',
      });
    } else {
      toast.dismiss('offline');
      toast.success('Connection restored.', { id: 'back-online', duration: 2500 });
    }
  }, [isOffline]);

  return null; // Render-less — side-effects only
}

// ── App Root ──────────────────────────────────────────────────────────────────

function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Global toast container */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { fontFamily: 'Inter, sans-serif', fontSize: '14px', borderRadius: '12px' },
              success: { style: { border: '1px solid #bbf7d0' } },
              error: { style: { border: '1px solid #fecaca' }, duration: 5000 },
            }}
          />

          {/* Render-less network watcher */}
          <NetworkWatcher />

          {/* Global privacy consent banner */}
          <PrivacyBanner />

          <Routes>
            {/* ── Public Routes ── */}
            <Route
              path="/"
              element={
                <ScopedErrorBoundary>
                  <Suspense fallback={<AuthSkeleton />}>
                    <LandingPage />
                  </Suspense>
                </ScopedErrorBoundary>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <ScopedErrorBoundary>
                    <Suspense fallback={<AuthSkeleton />}>
                      <AuthPage />
                    </Suspense>
                  </ScopedErrorBoundary>
                </PublicRoute>
              }
            />

            {/* ── Protected Routes ── */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ScopedErrorBoundary>
                    <Suspense fallback={<ChatSkeleton />}>
                      <ChatInterface />
                    </Suspense>
                  </ScopedErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide"
              element={
                <ProtectedRoute>
                  <ScopedErrorBoundary>
                    <Suspense fallback={<DashboardSkeleton />}>
                      <Dashboard />
                    </Suspense>
                  </ScopedErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* ── 404 Fallback ── */}
            <Route
              path="*"
              element={
                <div className="flex flex-col items-center justify-center min-h-screen pearl-bg font-inter gap-4">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant">search_off</span>
                  <h1 className="text-2xl font-bold text-on-surface">Page not found</h1>
                  <a href="/" className="text-secondary font-semibold hover:underline">Return home</a>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </UIProvider>
  );
}

export default App;
