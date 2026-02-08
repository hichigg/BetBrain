import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineBanner from './components/common/OfflineBanner';
import PageShell from './components/layout/PageShell';
import Dashboard from './pages/Dashboard';
import GamesToday from './pages/GamesToday';
import GameDetail from './pages/GameDetail';
import BetSlip from './pages/BetSlip';
import Performance from './pages/Performance';
import Settings from './pages/Settings';

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <PageShell>
          <OfflineBanner />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/games" element={<GamesToday />} />
            <Route path="/games/:sport/:gameId" element={<GameDetail />} />
            <Route path="/betslip" element={<BetSlip />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </PageShell>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;
