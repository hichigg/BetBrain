import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GamesToday from './pages/GamesToday';
import GameDetail from './pages/GameDetail';
import BetSlip from './pages/BetSlip';
import Performance from './pages/Performance';
import Settings from './pages/Settings';

function App() {
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">BetBrain</span>
              <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                AI
              </span>
            </div>
            <div className="flex items-center gap-1">
              <NavLink to="/" className={linkClass} end>
                Dashboard
              </NavLink>
              <NavLink to="/games" className={linkClass}>
                Games
              </NavLink>
              <NavLink to="/betslip" className={linkClass}>
                Bet Slip
              </NavLink>
              <NavLink to="/performance" className={linkClass}>
                Performance
              </NavLink>
              <NavLink to="/settings" className={linkClass}>
                Settings
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/games" element={<GamesToday />} />
          <Route path="/games/:sport/:gameId" element={<GameDetail />} />
          <Route path="/betslip" element={<BetSlip />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <footer className="text-center text-gray-500 text-xs py-4 border-t border-gray-800">
        For informational and entertainment purposes only. Sports betting involves risk. Always bet responsibly.
      </footer>
    </div>
  );
}

export default App;
