import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <MobileNav />

      {/* Main content */}
      <main className="flex-1 lg:ml-60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pt-[4.5rem] lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
