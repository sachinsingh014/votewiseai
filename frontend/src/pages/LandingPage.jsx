import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="bg-white font-inter text-on-surface min-h-screen">
      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/60 shadow-xl shadow-slate-900/20">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="material-symbols-outlined text-white text-lg" aria-hidden="true">how_to_vote</span>
            </div>
            <span className="text-xl font-black text-white tracking-tight">VoteWise <span className="text-orange-400">AI</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <a href="#features" className="text-slate-400 hover:text-white transition-all duration-200 text-sm font-medium hover:text-orange-400">Features</a>
            <a href="#about" className="text-slate-400 hover:text-white transition-all duration-200 text-sm font-medium hover:text-orange-400">About</a>
          </nav>
          {user ? (
            <Link
              to="/guide"
              className="btn-gradient-orange text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20"
              aria-label="Go to your dashboard"
            >
              My Dashboard →
            </Link>
          ) : (
            <Link
              to="/login"
              className="bg-white text-slate-900 hover:bg-orange-50 border border-slate-200 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:border-orange-300 active:scale-95"
              aria-label="Login to VoteWise AI"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="pt-20">
        {/* ── Hero Section ── */}
        <section
          className="relative overflow-hidden px-6 py-20 md:py-36"
          aria-labelledby="hero-heading"
          style={{
            background: 'linear-gradient(150deg, #0f172a 0%, #1e293b 40%, #1e1b4b 100%)',
          }}
        >
          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} aria-hidden="true" />
          {/* Orange glow blob */}
          <div className="absolute top-[-80px] left-[-80px] w-96 h-96 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} aria-hidden="true" />
          {/* Indigo glow blob */}
          <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} aria-hidden="true" />

          <div className="relative max-w-7xl mx-auto text-center flex flex-col items-center">
            {/* Badge */}
            <div className="animate-fade-in mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300 font-semibold text-xs uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Powered by Google Gemini AI
            </div>

            {/* Main Headline */}
            <h1 id="hero-heading" className="animate-fade-in-delay-1 text-5xl md:text-7xl font-black text-white max-w-4xl mb-6 leading-[1.05] tracking-tight">
              Your{' '}
              <span className="gradient-text-orange">AI Guide</span>
              {' '}to Indian{' '}
              <span className="gradient-text-orange">Elections</span>
            </h1>

            <p className="animate-fade-in-delay-2 text-lg md:text-xl text-slate-300 max-w-2xl mb-12 leading-relaxed font-light">
              Empowering every citizen with unbiased data, simple registration steps,
              and multi-language support to make an informed choice.
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-in-delay-3 flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-16">
              <Link
                to="/guide"
                className="btn-gradient-orange text-white px-10 py-4 rounded-2xl font-black text-base shadow-xl shadow-orange-500/30 inline-flex items-center justify-center gap-2"
                aria-label="Start your guided voting journey"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">rocket_launch</span>
                Start Voting Guide
              </Link>
              <a
                href="#features"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-10 py-4 rounded-2xl font-semibold text-base transition-all duration-200 active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">play_circle</span>
                How it Works
              </a>
            </div>

            {/* Hero Image */}
            <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-fade-in-delay-3" style={{ boxShadow: '0 32px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' }}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1O6FtUSHijRP--pUdTSNQajyfXr9jYDP59em9I664AVZLFyQz2PW3vULJiGEcCW5YbHBbw0mFU2_nA_lN5AB3HHxZp5qotODq_x12joPmlE7xaxo7zvKyBYa29-wpwwsn77NqqEtOibG9OFDmyHw5TS1pXGoEQxwmoGW0-sV7EmnRyMRVtm6T5Ri_bq6kM85ArqEvpSTM0fiZadkv7Il679ls538HmT-TBhyJdOMwUgQ-_tdAtB2WToigv9XpHe9HIIYSGTFTqGk"
                alt="A clean modern Indian polling station interior with an electronic voting machine on a wooden table"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section id="features" className="px-6 py-24 bg-slate-50" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-orange-500 font-bold text-xs uppercase tracking-widest mb-3">Why VoteWise AI</p>
              <h2 id="features-heading" className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
                The Future of <span className="gradient-text-hero">Civic Tech</span>
              </h2>
              <p className="text-base text-slate-500 max-w-md mx-auto">
                Simplified, unbiased information for the modern Indian voter.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature Card 1 */}
              <article className="card-hover bg-white p-8 rounded-2xl card-shadow border border-slate-100 flex flex-col items-start group">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-100 transition-colors duration-200" aria-hidden="true">
                  <span className="material-symbols-outlined text-3xl">balance</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">Unbiased AI</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Our algorithms aggregate public records and manifestos to provide neutral, fact-checked comparisons without any political leaning.
                </p>
                <div className="mt-6 text-indigo-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                  Learn more <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </article>

              {/* Feature Card 2 */}
              <article className="card-hover bg-white p-8 rounded-2xl card-shadow border border-slate-100 flex flex-col items-start group">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-6 group-hover:bg-orange-100 transition-colors duration-200" aria-hidden="true">
                  <span className="material-symbols-outlined text-3xl">steps</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">Step-by-Step Guidance</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  From voter ID registration to finding your polling booth, we break down complex civic processes into simple, actionable steps.
                </p>
                <div className="mt-6 text-orange-500 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                  Get started <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </article>

              {/* Feature Card 3 */}
              <article className="card-hover bg-white p-8 rounded-2xl card-shadow border border-slate-100 flex flex-col items-start group">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6 group-hover:bg-teal-100 transition-colors duration-200" aria-hidden="true">
                  <span className="material-symbols-outlined text-3xl">translate</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">Multilingual Support</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Access critical election information in Hindi, English, Bengali, Tamil, and 8 other Indian languages with native AI translation.
                </p>
                <div className="mt-6 text-teal-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                  Explore languages <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Stats Bento Section ── */}
        <section id="about" className="px-6 py-24 bg-white" aria-labelledby="stats-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-orange-500 font-bold text-xs uppercase tracking-widest mb-3">By The Numbers</p>
              <h2 id="stats-heading" className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Trusted Across <span className="gradient-text-hero">India</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card-hover md:col-span-2 rounded-2xl p-10 flex flex-col justify-between h-64 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)', transform: 'translate(30px, -30px)' }} aria-hidden="true" />
                <h4 className="text-lg font-bold text-slate-300">Nationwide Reach</h4>
                <div>
                  <span className="text-7xl font-black gradient-text-orange">28</span>
                  <p className="text-slate-400 mt-2 text-sm">States and 8 Union Territories covered with real-time updates.</p>
                </div>
              </div>
              <div className="card-hover rounded-2xl p-8 flex flex-col justify-center items-center h-64 text-white text-center" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}>
                <span className="material-symbols-outlined text-5xl mb-3 text-indigo-200" aria-hidden="true">verified_user</span>
                <div className="text-5xl font-black text-white">100%</div>
                <p className="text-indigo-300 text-xs mt-2 font-medium">Verified Data Sources</p>
              </div>
              <div className="card-hover bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 flex flex-col justify-center h-64 text-white">
                <div className="text-6xl font-black text-white">50M+</div>
                <p className="text-orange-100 mt-2 font-semibold">Voters Assisted</p>
                <span className="material-symbols-outlined text-orange-200/50 text-6xl mt-2" aria-hidden="true">groups</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA Section ── */}
        <section className="px-6 py-24 text-center" style={{ background: 'linear-gradient(150deg, #0f172a 0%, #1e1b4b 100%)' }}>
          <div className="max-w-2xl mx-auto">
            <p className="text-orange-400 font-bold text-xs uppercase tracking-widest mb-4">Ready to Vote Smart?</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Know your vote,<br /><span className="gradient-text-orange">own your future.</span>
            </h2>
            <p className="text-slate-400 mb-10 text-lg">Join thousands of citizens making informed choices with VoteWise AI.</p>
            <Link
              to="/login"
              className="btn-gradient-orange text-white px-12 py-4 rounded-2xl font-black text-base shadow-2xl shadow-orange-500/30 inline-flex items-center gap-2"
              aria-label="Get started with VoteWise AI"
            >
              <span className="material-symbols-outlined" aria-hidden="true">rocket_launch</span>
              Get Started — It's Free
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-slate-800 w-full py-12 px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-base" aria-hidden="true">how_to_vote</span>
              </div>
              <span className="text-base font-black text-white">VoteWise <span className="text-orange-400">AI</span></span>
            </div>
            <p className="text-sm text-slate-500 text-center md:text-left max-w-xs">
              © 2024 VoteWise AI. Empowering Indian Voters through technology and transparency.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-8" aria-label="Footer navigation">
            <a className="text-slate-500 hover:text-orange-400 transition-colors text-sm font-medium" href="#features">Features</a>
            <a className="text-slate-500 hover:text-orange-400 transition-colors text-sm font-medium" href="#about">About</a>
            <a className="text-slate-500 hover:text-orange-400 transition-colors text-sm font-medium" href="#">Privacy Policy</a>
            <a className="text-slate-500 hover:text-orange-400 transition-colors text-sm font-medium" href="#">Terms of Service</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
