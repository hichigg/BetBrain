import { NavLink } from 'react-router-dom';
import useOddsUsage from '../../hooks/useOddsUsage';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/games', label: 'Games Today', icon: GamesIcon },
  { to: '/betslip', label: 'My Bet Slip', icon: BetSlipIcon },
  { to: '/performance', label: 'Performance', icon: PerformanceIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export { NAV_ITEMS };

export default function Sidebar() {
  const { remaining } = useOddsUsage();

  return (
    <aside className="hidden lg:flex lg:flex-col w-60 bg-slate-900 border-r border-slate-800 fixed inset-y-0 left-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <svg className="w-7 h-7 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-lg font-bold text-white tracking-tight">BetBrain</span>
        </div>
        <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">
          AI
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Odds API usage */}
      <div className="px-4 py-3 border-t border-slate-800/60 space-y-2">
        <OddsUsageIndicator remaining={remaining} />
        <p className="text-[10px] text-slate-600 leading-relaxed">
          For entertainment only. Bet responsibly.
        </p>
      </div>
    </aside>
  );
}

function OddsUsageIndicator({ remaining }) {
  if (remaining === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <StatusDot className="bg-slate-600" />
        <span>Connecting...</span>
      </div>
    );
  }

  const total = 100; // hourly limit for free tier
  const pct = Math.min((remaining / total) * 100, 100);
  const color =
    remaining < 10
      ? 'bg-red-500'
      : remaining < 30
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  const textColor =
    remaining < 10
      ? 'text-red-400'
      : remaining < 30
        ? 'text-amber-400'
        : 'text-slate-400';

  return (
    <div>
      <p className="text-[10px] text-slate-600 mb-1.5">Requests remaining, resets hourly</p>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <StatusDot className={color} />
        </div>
        <span className={`text-[11px] font-mono font-medium ${textColor}`}>
          {remaining}
        </span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusDot({ className }) {
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${className}`} />;
}

// ── SVG Icons ────────────────────────────────────────────────────────

function DashboardIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
    </svg>
  );
}

function GamesIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function BetSlipIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

function PerformanceIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-6 4 3 5-7" />
    </svg>
  );
}

function SettingsIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
