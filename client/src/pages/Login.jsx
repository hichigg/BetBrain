import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';
import { useToast } from '../components/common/Toast';

const FEATURES = [
  {
    icon: BrainIcon,
    title: 'AI-Powered Picks',
    desc: 'Claude analyzes stats, injuries, odds, and trends to find the best bets.',
  },
  {
    icon: ChartIcon,
    title: 'Real-Time Odds',
    desc: 'Live odds from FanDuel and DraftKings, updated every 15 minutes.',
  },
  {
    icon: TargetIcon,
    title: 'Confidence Scoring',
    desc: 'Every pick rated 1-10 with expected value and risk tier.',
  },
  {
    icon: TrophyIcon,
    title: 'Track Performance',
    desc: 'Full P&L tracking, ROI charts, and win-rate breakdowns.',
  },
];

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

export default function Login() {
  const { isAuthenticated, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const from = location.state?.from || '/';

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, from]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await authApi.sendOTP(email.trim().toLowerCase());
      setStep('otp');
      setCooldown(60);
      addToast('Verification code sent to your email', 'success');
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err) {
      addToast(err.message || 'Failed to send code', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setVerifying(true);
    try {
      const data = await authApi.verifyOTP(email.trim().toLowerCase(), otp.trim());
      login(data.token, data.user);
      addToast(`Welcome, ${data.user.name || data.user.email}!`, 'success');
      navigate(from, { replace: true });
    } catch (err) {
      addToast(err.message || 'Invalid code', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setSending(true);
    try {
      await authApi.sendOTP(email.trim().toLowerCase());
      setCooldown(60);
      addToast('New code sent', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to resend code', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gray-950" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 h-16">
        <div className="flex items-center gap-2.5">
          <svg className="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-xl font-bold text-white tracking-tight">BetBrain</span>
          <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-2xl text-center mb-10">
          {/* Sport tags */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {SPORTS.map((sport) => (
              <span
                key={sport}
                className="text-[10px] font-semibold tracking-wider text-indigo-400/70 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full"
              >
                {sport}
              </span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            Smarter bets,{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              powered by AI
            </span>
          </h1>

          <p className="text-gray-400 text-base sm:text-lg max-w-lg mx-auto mb-10">
            BetBrain analyzes real-time stats, odds, and injuries across 6 sports to surface high-confidence betting opportunities.
          </p>

          {/* Sign-in card */}
          <div className="inline-block bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800/80 p-8 sm:p-10 shadow-2xl shadow-indigo-500/5 w-full max-w-sm">
            <p className="text-sm text-gray-400 mb-5">
              {step === 'email' ? 'Sign in to get started' : 'Enter verification code'}
            </p>

            {step === 'email' ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {sending ? 'Sending...' : 'Send Login Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <p className="text-xs text-gray-500 mb-2">
                  Code sent to <span className="text-gray-300">{email}</span>
                </p>
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-center text-2xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={verifying || otp.length < 6}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {verifying ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(''); }}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || sending}
                    className="text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            <p className="text-[11px] text-gray-600 mt-5">
              Free tier includes 1 AI analysis per day
            </p>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-3xl w-full">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-4 text-left group hover:border-indigo-500/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-colors">
                <Icon className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-gray-200 mb-1">{title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center px-6 py-5 border-t border-gray-800/40">
        <p className="text-[11px] text-gray-600 mb-1">
          For entertainment purposes only. Sports betting involves risk. Always bet responsibly.
        </p>
        <Link to="/privacy" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────

function BrainIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
      <path d="M9 21h6" />
      <path d="M10 17v4" />
      <path d="M14 17v4" />
    </svg>
  );
}

function ChartIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function TargetIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function TrophyIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2" />
      <path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
      <path d="M6 3h12v7a6 6 0 01-12 0V3z" />
      <path d="M9 21h6" />
      <path d="M12 16v5" />
    </svg>
  );
}
