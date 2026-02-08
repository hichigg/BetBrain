import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GamesToday from './pages/GamesToday';
import GameDetail from './pages/GameDetail';
import BetSlip from './pages/BetSlip';
import Performance from './pages/Performance';
import Settings from './pages/Settings';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/games', label: 'Games', icon: GamesIcon },
  { to: '/betslip', label: 'Bet Slip', icon: BetSlipIcon },
  { to: '/performance', label: 'Performance', icon: PerformanceIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function App() {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-56 bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-800/60">
          <span className="text-lg font-bold text-white tracking-tight">BetBrain</span>
          <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
            AI
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800/60">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            For entertainment only. Bet responsibly.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 bg-gray-900 border-b border-gray-800 z-30">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">BetBrain</span>
            <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">AI</span>
          </div>
        </div>
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 lg:ml-56">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/games" element={<GamesToday />} />
            <Route path="/games/:sport/:gameId" element={<GameDetail />} />
            <Route path="/betslip" element={<BetSlip />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// ── Inline SVG icons ────────────────────────────────────────────────

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

export default App;
