import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function PageShell({ children }) {
  const location = useLocation();

  // Full-screen layout for login page (no sidebar/nav)
  if (location.pathname === '/login') {
    return (
      <div className="min-h-screen bg-gray-950">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <MobileNav />

      {/* Main content */}
      <main className="flex-1 lg:ml-60 min-w-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pt-[4.5rem] lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
