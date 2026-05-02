import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuth } from 'firebase/auth';
import { fetchWithRetry } from '../services/fetchWithRetry';
import { Analytics } from '../services/analytics';

// Removed unused DEFAULT_STEPS

const STATUS_CONFIG = {
  completed: {
    badge: 'Completed',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    iconClass: 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-100',
    connectorClass: 'bg-emerald-200',
    cardBorder: 'border-emerald-100',
    cardBg: 'bg-white',
  },
  action_required: {
    badge: 'Action Required',
    badgeClass: 'bg-orange-100 text-orange-700 border border-orange-200',
    iconClass: 'bg-orange-100 text-orange-600 shadow-lg shadow-orange-100',
    connectorClass: 'bg-slate-200',
    cardBorder: 'border-orange-200 ring-1 ring-orange-100',
    cardBg: 'bg-orange-50/30',
  },
  locked: {
    badge: 'Locked',
    badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
    iconClass: 'bg-slate-100 text-slate-400',
    connectorClass: 'bg-slate-200',
    cardBorder: 'border-slate-100',
    cardBg: 'bg-white',
  },
};

const ELECTION_DATES = [
  { label: 'Voter Registration Deadline', date: 'Dec 15, 2024', icon: 'event' },
  { label: 'Election Day', date: 'Jan 20, 2025', icon: 'how_to_vote' },
  { label: 'Results Announced', date: 'Jan 23, 2025', icon: 'bar_chart' },
];

function StepCard({ step, isLast, onComplete }) {
  const config = STATUS_CONFIG[step.status];
  return (
    <li className="relative flex gap-5">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[22px] top-14 bottom-0 w-0.5" aria-hidden="true">
          <div className={`h-full w-full ${config.connectorClass} rounded-full`} />
        </div>
      )}
      {/* Step icon */}
      <div className={`relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 ${config.iconClass} transition-transform duration-200 hover:scale-105`} aria-hidden="true">
        <span className="material-symbols-outlined text-xl">{step.icon}</span>
      </div>
      {/* Step content */}
      <div className={`flex-1 ${config.cardBg} rounded-2xl p-6 card-shadow border ${config.cardBorder} mb-5 card-hover`}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${config.badgeClass}`}>
            {config.badge}
          </span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">{step.description}</p>
        <div className="flex items-center gap-3">
          {step.cta && (
            <Link
              to={step.cta.href}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${step.status === 'locked' ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none' : 'btn-gradient-orange text-white shadow-lg shadow-orange-500/20'}`}
              aria-label={`${step.cta.label} for ${step.title}`}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">navigation</span>
              {step.cta.label}
            </Link>
          )}
          {step.status === 'action_required' && (
            <button
              onClick={() => onComplete(step.id)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all duration-200 active:scale-95"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">check</span>
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-dashed border-slate-200 animate-pulse" aria-label="Loading next step" aria-busy="true">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-200" />
        <div className="h-4 bg-slate-200 rounded-xl w-48" />
      </div>
      <div className="h-3 bg-slate-200 rounded-xl w-full mb-2" />
      <div className="h-3 bg-slate-200 rounded-xl w-3/4" />
      <p className="text-xs text-slate-400 mt-4 font-medium text-center">Election Day Prep — Coming Soon</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async () => {
    const auth = getAuth();
    return auth.currentUser?.getIdToken(false) ?? null;
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchProgress = async () => {
      try {
        const token = await getToken();
        // fetchWithRetry: retries up to 3x on network failures (GET is idempotent)
        const res = await fetchWithRetry('/api/journey/progress', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setSteps(data.data.roadmap);
          Analytics.dashboardViewed();
        } else {
          console.error('Failed to fetch roadmap:', data);
        }
      } catch (err) {
        console.error('Error fetching roadmap:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [user, getToken]);

  const handleCompleteStep = async (stepId) => {
    if (!steps || !user) return;

    // Optimistic UI update
    const newSteps = steps.map((step) => {
      if (step.id === stepId) return { ...step, status: 'completed' };
      if (step.id === stepId + 1) return { ...step, status: 'action_required' };
      return step;
    });
    setSteps(newSteps);

    try {
      const token = await getToken();
      const res = await fetch('/api/journey/progress', {
        method: 'POST',  // POST — never auto-retried by fetchWithRetry
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stepId }),
      });
      if (!res.ok) {
        setSteps(steps);
        console.error('Failed to update step');
      } else {
        const completedStep = steps.find((s) => s.id === stepId);
        Analytics.journeyStepCompleted({ stepId, stepTitle: completedStep?.title });
      }
    } catch (err) {
      setSteps(steps);
      console.error('Error updating step:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const completedCount = steps ? steps.filter((s) => s.status === 'completed').length : 0;
  const progressPercent = steps ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="bg-slate-50 font-inter min-h-screen">
      {/* ── Navbar ── */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-40 shadow-lg shadow-slate-900/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Go to VoteWise AI home">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
              <span className="material-symbols-outlined text-white text-base" aria-hidden="true">how_to_vote</span>
            </div>
            <span className="font-black text-white text-lg">VoteWise <span className="text-orange-400">AI</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/chat"
              id="open-chat-btn"
              className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
              aria-label="Open AI Chat"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">smart_toy</span>
              Ask AI
            </Link>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1 text-slate-500 hover:text-red-400 text-xs font-semibold transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-red-500/10"
              aria-label="Sign out of your account"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">logout</span>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10" id="main-content">
        {/* ── Welcome Header ── */}
        <section className="mb-10" aria-labelledby="dashboard-heading">
          <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100 relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 pointer-events-none" style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)', transform: 'translate(30%, -30%)' }} aria-hidden="true" />
            <p className="text-xs uppercase tracking-widest text-orange-500 font-bold mb-2">Your Dashboard</p>
            <h1 id="dashboard-heading" className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
              Welcome back, <span className="gradient-text-hero">Citizen.</span>
            </h1>
            <p className="text-base text-slate-500 mb-6">Here is your personalized voting roadmap.</p>

            {/* Progress bar */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    boxShadow: '0 0 12px rgba(16,185,129,0.4)',
                  }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-sm text-slate-500 font-bold whitespace-nowrap">
                {loading ? '…' : `${completedCount} / ${steps?.length || 0} complete`}
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main Tracker ── */}
          <section className="lg:col-span-2" aria-labelledby="roadmap-heading">
            <h2 id="roadmap-heading" className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500 text-xl" aria-hidden="true">map</span>
              Your Voting Roadmap
            </h2>
            <ol className="space-y-0" aria-label="Voting steps">
              {loading ? (
                <>
                  <SkeletonCard />
                  <div className="mt-5"><SkeletonCard /></div>
                </>
              ) : (
                steps?.map((step, index) => (
                  <StepCard key={step.id} step={step} isLast={index === steps.length - 1} onComplete={handleCompleteStep} />
                ))
              )}
            </ol>
            {/* Upcoming step skeleton */}
            {!loading && (
              <div className="mt-2">
                <SkeletonCard />
              </div>
            )}
          </section>

          {/* ── Sidebar ── */}
          <aside aria-labelledby="dates-heading">
            <h2 id="dates-heading" className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 text-xl" aria-hidden="true">calendar_month</span>
              Important Dates
            </h2>
            <div className="bg-white rounded-2xl card-shadow border border-slate-100 overflow-hidden mb-4">
              {ELECTION_DATES.map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors duration-150 ${index !== ELECTION_DATES.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <span className="material-symbols-outlined text-indigo-600 text-base">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                    <p className="text-sm font-black text-slate-900">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Chat CTA */}
            <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)', transform: 'translate(30%, -30%)' }} aria-hidden="true" />
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-orange-400 text-xl" aria-hidden="true">smart_toy</span>
                <span className="font-black text-sm text-white">Have questions?</span>
              </div>
              <p className="text-slate-400 text-xs mb-4 leading-relaxed">Ask VoteWise AI anything about voting, candidates, or polling stations.</p>
              <Link
                to="/chat"
                className="w-full flex items-center justify-center gap-2 btn-gradient-orange text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20"
                aria-label="Open AI chat assistant"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">chat</span>
                Chat with AI
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
