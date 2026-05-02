import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Inline form field component ── */
function Field({ id, label, type = 'text', value, onChange, error, placeholder, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder-slate-400 bg-white transition-all duration-200 outline-none shadow-sm
          focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
          ${error ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-slate-200 hover:border-slate-300'}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600 font-semibold" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Firebase error → human readable string ── */
function parseFirebaseError(code) {
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'An unexpected error occurred. Please try again.';
}

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState({});

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupErrors, setSignupErrors] = useState({});

  // If already logged in, redirect straight to dashboard
  if (user) return <Navigate to="/guide" replace />;

  /* ── Validation ── */
  const validateLogin = () => {
    const errs = {};
    if (!loginEmail) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(loginEmail)) errs.email = 'Enter a valid email address.';
    if (!loginPassword) errs.password = 'Password is required.';
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateSignup = () => {
    const errs = {};
    if (!signupEmail) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(signupEmail)) errs.email = 'Enter a valid email address.';
    if (!signupPassword) errs.password = 'Password is required.';
    else if (signupPassword.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (!signupConfirm) errs.confirm = 'Please confirm your password.';
    else if (signupPassword !== signupConfirm) errs.confirm = 'Passwords do not match.';
    setSignupErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Submit handlers ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setGlobalError('');
    if (!validateLogin()) return;
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate('/guide');
    } catch (err) {
      setGlobalError(parseFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setGlobalError('');
    if (!validateSignup()) return;
    setLoading(true);
    try {
      await register(signupEmail, signupPassword);
      navigate('/guide');
    } catch (err) {
      setGlobalError(parseFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setGlobalError('');
    setLoginErrors({});
    setSignupErrors({});
  };

  return (
    <div className="min-h-screen flex font-inter">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden" style={{ background: 'linear-gradient(150deg, #0f172a 0%, #1e1b4b 100%)' }}>
        {/* Background glows */}
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} aria-hidden="true" />
        <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} aria-hidden="true" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '28px 28px' }} aria-hidden="true" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <span className="material-symbols-outlined text-white text-xl" aria-hidden="true">how_to_vote</span>
          </div>
          <span className="text-2xl font-black text-white">VoteWise <span className="text-orange-400">AI</span></span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white mb-6 leading-tight">
            Know your vote,<br />
            <span className="gradient-text-orange">own your future.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Join thousands of Indian citizens making informed electoral choices with unbiased AI guidance.
          </p>

          {/* Trust stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-3xl font-black gradient-text-orange">50M+</p>
              <p className="text-slate-400 text-xs mt-1 font-medium">Voters Assisted</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-3xl font-black text-white">28</p>
              <p className="text-slate-400 text-xs mt-1 font-medium">States Covered</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-slate-600 text-xs">© 2024 VoteWise AI. All rights reserved.</p>
      </div>

      {/* ── Right Panel: Auth Form ── */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile navbar */}
        <header className="lg:hidden bg-slate-900 w-full px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Back to VoteWise AI home">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-base" aria-hidden="true">how_to_vote</span>
            </div>
            <span className="font-black text-white tracking-tight">VoteWise <span className="text-orange-400">AI</span></span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12" id="main-content">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {tab === 'login' ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm">
                {tab === 'login'
                  ? 'Sign in to access your personalized voting guide.'
                  : 'Join thousands of informed Indian voters.'}
              </p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 overflow-hidden">
              {/* Tab Switcher */}
              <div className="flex bg-slate-50 p-1.5 m-5 rounded-2xl" role="tablist" aria-label="Authentication options">
                {['login', 'signup'].map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    aria-controls={`panel-${t}`}
                    id={`tab-${t}`}
                    onClick={() => switchTab(t)}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                      ${tab === t
                        ? 'bg-white text-slate-900 shadow-md shadow-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {t === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              <div className="px-6 pb-6">
                {/* Global Error Banner */}
                {globalError && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-4 py-3 text-sm"
                  >
                    <span className="material-symbols-outlined text-base mt-0.5 flex-shrink-0" aria-hidden="true">error</span>
                    <span>{globalError}</span>
                  </div>
                )}

                {/* ── LOGIN PANEL ── */}
                {tab === 'login' && (
                  <form
                    id="panel-login"
                    role="tabpanel"
                    aria-labelledby="tab-login"
                    onSubmit={handleLogin}
                    noValidate
                    className="space-y-5"
                  >
                    <Field
                      id="login-email"
                      label="Email address"
                      type="email"
                      value={loginEmail}
                      onChange={setLoginEmail}
                      error={loginErrors.email}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                    <Field
                      id="login-password"
                      label="Password"
                      type="password"
                      value={loginPassword}
                      onChange={setLoginPassword}
                      error={loginErrors.password}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />

                    <button
                      id="login-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 btn-gradient-orange disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed text-white font-black py-3.5 px-6 rounded-2xl text-sm shadow-lg shadow-orange-500/25"
                      aria-busy={loading}
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                          Signing in…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base" aria-hidden="true">login</span>
                          Sign In
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchTab('signup')}
                        className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline"
                      >
                        Create one
                      </button>
                    </p>
                  </form>
                )}

                {/* ── SIGNUP PANEL ── */}
                {tab === 'signup' && (
                  <form
                    id="panel-signup"
                    role="tabpanel"
                    aria-labelledby="tab-signup"
                    onSubmit={handleSignup}
                    noValidate
                    className="space-y-5"
                  >
                    <Field
                      id="signup-email"
                      label="Email address"
                      type="email"
                      value={signupEmail}
                      onChange={setSignupEmail}
                      error={signupErrors.email}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                    <Field
                      id="signup-password"
                      label="Password"
                      type="password"
                      value={signupPassword}
                      onChange={setSignupPassword}
                      error={signupErrors.password}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                    />
                    <Field
                      id="signup-confirm"
                      label="Confirm password"
                      type="password"
                      value={signupConfirm}
                      onChange={setSignupConfirm}
                      error={signupErrors.confirm}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />

                    <button
                      id="signup-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 btn-gradient-orange disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed text-white font-black py-3.5 px-6 rounded-2xl text-sm shadow-lg shadow-orange-500/25"
                      aria-busy={loading}
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                          Creating account…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
                          Create Account
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => switchTab('login')}
                        className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-500" aria-hidden="true">lock</span>
                Secure & Encrypted
              </div>
              <div className="w-px h-4 bg-slate-200" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-500" aria-hidden="true">verified_user</span>
                Firebase Auth
              </div>
              <div className="w-px h-4 bg-slate-200" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-500" aria-hidden="true">shield</span>
                No Data Sold
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
