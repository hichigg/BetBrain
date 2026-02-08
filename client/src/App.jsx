import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { SettingsProvider } from './hooks/useSettings';
import { AuthProvider } from './hooks/useAuth';
import ErrorBoundary from './components/common/ErrorBoundary';
import OfflineBanner from './components/common/OfflineBanner';
import PageShell from './components/layout/PageShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import GamesToday from './pages/GamesToday';
import GameDetail from './pages/GameDetail';
import BetSlip from './pages/BetSlip';
import Performance from './pages/Performance';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Pricing from './pages/Pricing';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <ErrorBoundary>
            <PageShell>
              <OfflineBanner />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/games" element={<ProtectedRoute><GamesToday /></ProtectedRoute>} />
                <Route path="/games/:sport/:gameId" element={<GameDetail />} />
                <Route path="/betslip" element={<ProtectedRoute><BetSlip /></ProtectedRoute>} />
                <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              </Routes>
            </PageShell>
          </ErrorBoundary>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
