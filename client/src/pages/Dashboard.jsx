import { useState } from 'react';
import { Link } from 'react-router-dom';
import PickCard from '../components/picks/PickCard';
import SportFilterBar from '../components/common/SportFilterBar';
import ErrorPanel from '../components/common/ErrorPanel';
import { useTopPicks } from '../hooks/usePicks';
import useGames from '../hooks/useGames';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Skeletons ───────────────────────────────────────────────────────

function PickSkeleton() {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-2.5 w-10 bg-gray-700 rounded" />
            <div className="h-2.5 w-24 bg-gray-700 rounded" />
          </div>
          <div className="h-4 w-48 bg-gray-700 rounded" />
          <div className="flex gap-3">
            <div className="h-3 w-14 bg-gray-700 rounded" />
            <div className="h-3 w-12 bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-700 rounded" />
          </div>
          <div className="h-3 w-full bg-gray-700/50 rounded" />
        </div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 p-5 animate-pulse">
      <div className="h-3 w-20 bg-gray-700 rounded mb-3" />
      <div className="h-7 w-12 bg-gray-700 rounded" />
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────

export default function Dashboard() {
  const [date] = useState(todayStr);
  const { picks: topPicks, loading: picksLoading, error: picksError, refetch: refetchPicks } = useTopPicks(date, 5);
  const { games, loading: gamesLoading, error: gamesError, refetch: refetchGames } = useGames('all', date);

  // Count games per sport
  const gameCounts = {};
  for (const game of games) {
    gameCounts[game.sport] = (gameCounts[game.sport] || 0) + 1;
  }
  const totalGames = games.length;

  // Value picks: sort by EV instead of confidence
  const valuePicks = [...topPicks]
    .sort((a, b) => {
      const evA = parseFloat(a.expected_value) || 0;
      const evB = parseFloat(b.expected_value) || 0;
      return evB - evA;
    })
    .slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">{formatDate(date)}</p>
      </div>

      {/* Errors */}
      {gamesError && (
        <div className="mb-4">
          <ErrorPanel message={`Failed to load games: ${gamesError}`} onRetry={refetchGames} />
        </div>
      )}
      {picksError && (
        <div className="mb-4">
          <ErrorPanel message={`Failed to load picks: ${picksError}`} onRetry={refetchPicks} />
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {gamesLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Games Today" value={totalGames} />
            <StatCard label="Sports Active" value={Object.keys(gameCounts).length} />
            <StatCard
              label="Picks Generated"
              value={picksLoading ? '...' : topPicks.length}
            />
            <StatCard
              label="Avg Confidence"
              value={
                topPicks.length > 0
                  ? (topPicks.reduce((s, p) => s + p.confidence, 0) / topPicks.length).toFixed(1)
                  : '—'
              }
            />
          </>
        )}
      </div>

      {/* Sport quick-links */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Sports
          </h2>
          <Link
            to="/games"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all games
          </Link>
        </div>
        {gamesLoading ? (
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-20 bg-gray-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <SportFilterBar gameCounts={gameCounts} linkMode />
        )}
      </div>

      {/* Top Picks */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Top Picks</h2>
          <span className="text-xs text-gray-500">Sorted by confidence</span>
        </div>

        {picksLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <PickSkeleton key={i} />
            ))}
          </div>
        ) : topPicks.length > 0 ? (
          <div className="space-y-3">
            {topPicks.map((pick, i) => (
              <PickCard key={`${pick.gameId}-${pick.bet_type}-${i}`} pick={pick} />
            ))}
          </div>
        ) : (
          <EmptyPicksState />
        )}
      </section>

      {/* Value Finder */}
      {valuePicks.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Value Finder</h2>
            <span className="text-xs text-gray-500">Highest expected value</span>
          </div>
          <div className="space-y-3">
            {valuePicks.map((pick, i) => (
              <PickCard
                key={`val-${pick.gameId}-${pick.bet_type}-${i}`}
                pick={pick}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 px-4 py-4">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyPicksState() {
  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 py-12 text-center">
      <p className="text-gray-400 font-medium mb-1">No picks yet</p>
      <p className="text-gray-600 text-sm">
        Picks are generated when you view games with available odds.
      </p>
      <Link
        to="/games"
        className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
      >
        Browse Games
      </Link>
    </div>
  );
}
