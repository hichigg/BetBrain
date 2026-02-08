import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './Sidebar';
import useOddsUsage from '../../hooks/useOddsUsage';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/games': 'Games Today',
  '/betslip': 'My Bet Slip',
  '/performance': 'Performance',
  '/settings': 'Settings',
};

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { remaining } = useOddsUsage();

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Resolve page title — handle dynamic routes like /games/:sport/:gameId
  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/games/') ? 'Game Detail' : 'BetBrain');

  return (
    <>
      {/* Top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 bg-slate-900 border-b border-slate-800 z-40">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-white">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white tracking-tight">BetBrain</span>
            <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">
              AI
            </span>
          </div>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-lg font-bold text-white tracking-tight">BetBrain</span>
            <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">
              AI
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
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

        {/* Odds usage */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-slate-800/60">
          {remaining !== null ? (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Odds API</span>
              <span className={`font-mono font-medium ${remaining < 50 ? 'text-red-400' : 'text-slate-400'}`}>
                {remaining} left
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-600">Odds API: connecting...</span>
          )}
        </div>
      </div>
    </>
  );
}
