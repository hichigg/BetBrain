import { useState } from 'react';
import { Link } from 'react-router-dom';
import useGames from '../hooks/useGames';
import ErrorPanel from '../components/common/ErrorPanel';

const SPORTS = [
  { key: 'all', label: 'All' },
  { key: 'nfl', label: 'NFL' },
  { key: 'ncaaf', label: 'NCAAF' },
  { key: 'nba', label: 'NBA' },
  { key: 'ncaab', label: 'NCAAB' },
  { key: 'mlb', label: 'MLB' },
  { key: 'nhl', label: 'NHL' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatOdds(price) {
  if (price == null) return '—';
  return price > 0 ? `+${price}` : `${price}`;
}

function formatTime(dateStr, status) {
  if (!status) return '';
  if (status.state === 'STATUS_FINAL') return 'Final';
  if (status.state === 'STATUS_IN_PROGRESS') {
    return status.detail || 'Live';
  }
  // Pre-game — show start time
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return status.detail || '';
  }
}

// ── Loading Skeleton ────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-5 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-3 w-16 bg-gray-700 rounded" />
        <div className="h-3 w-12 bg-gray-700 rounded" />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <div className="h-4 w-36 bg-gray-700 rounded" />
          <div className="h-4 w-12 bg-gray-700 rounded" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-32 bg-gray-700 rounded" />
          <div className="h-4 w-12 bg-gray-700 rounded" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-700/50 flex gap-4">
        <div className="h-3 w-20 bg-gray-700 rounded" />
        <div className="h-3 w-20 bg-gray-700 rounded" />
        <div className="h-3 w-20 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// ── Game Card ───────────────────────────────────────────────────────

function GameCard({ game }) {
  const { home, away, odds, status, date: gameDate, sport } = game;
  const timeLabel = formatTime(gameDate, status);
  const isLive = status?.state === 'STATUS_IN_PROGRESS';
  const isFinal = status?.state === 'STATUS_FINAL';

  const ml = odds?.consensus?.moneyline;
  const spread = odds?.consensus?.spread;
  const total = odds?.consensus?.total;

  return (
    <Link
      to={`/games/${sport}/${game.id}`}
      className="block bg-gray-800/60 rounded-xl border border-gray-700/50 p-5 hover:border-indigo-500/50 hover:bg-gray-800 transition-all group"
    >
      {/* Header: sport badge + time */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {sport?.toUpperCase()}
        </span>
        <span
          className={`text-xs font-medium ${
            isLive
              ? 'text-emerald-400'
              : isFinal
                ? 'text-gray-500'
                : 'text-gray-400'
          }`}
        >
          {isLive && (
            <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
          )}
          {timeLabel}
        </span>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <TeamRow
          team={away}
          mlPrice={ml?.find((m) => m.team === away.name)?.price}
          spreadLine={spread?.find((s) => s.team === away.name)}
          isFinal={isFinal}
        />
        <TeamRow
          team={home}
          mlPrice={ml?.find((m) => m.team === home.name)?.price}
          spreadLine={spread?.find((s) => s.team === home.name)}
          isFinal={isFinal}
        />
      </div>

      {/* Odds summary bar */}
      {odds && (
        <div className="mt-3 pt-3 border-t border-gray-700/40 flex gap-5 text-[11px] text-gray-500">
          {spread?.[0] && (
            <span>
              Spread{' '}
              <span className="text-gray-300">
                {spread[0].point > 0 ? '+' : ''}
                {spread[0].point}
              </span>
            </span>
          )}
          {total?.[0] && (
            <span>
              O/U{' '}
              <span className="text-gray-300">{total[0].point}</span>
            </span>
          )}
          <span className="ml-auto text-gray-600 group-hover:text-gray-500 transition-colors">
            {odds.bookmakers?.length || 0} books
          </span>
        </div>
      )}
    </Link>
  );
}

function TeamRow({ team, mlPrice, spreadLine, isFinal }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {team.logo && (
          <img
            src={team.logo}
            alt=""
            className="w-6 h-6 object-contain flex-shrink-0"
          />
        )}
        <span className="text-sm font-medium text-gray-100 truncate">
          {team.name}
        </span>
        {team.record && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {team.record}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {spreadLine && (
          <span className="text-xs text-gray-400 w-12 text-right">
            {spreadLine.point > 0 ? '+' : ''}
            {spreadLine.point}
          </span>
        )}
        {mlPrice != null && (
          <span
            className={`text-xs font-mono w-14 text-right ${
              mlPrice > 0 ? 'text-emerald-400' : 'text-gray-300'
            }`}
          >
            {formatOdds(mlPrice)}
          </span>
        )}
        {isFinal && team.score != null && (
          <span className="text-sm font-bold text-white w-8 text-right">
            {team.score}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────

function EmptyState({ sport, date }) {
  return (
    <div className="text-center py-12 sm:py-20">
      <div className="text-4xl mb-3 opacity-40">&#127944;</div>
      <p className="text-gray-400 text-base sm:text-lg font-medium">No games scheduled</p>
      <p className="text-gray-600 text-sm mt-1">
        {sport === 'all' ? 'No games found' : `No ${sport.toUpperCase()} games`}{' '}
        for {date}
      </p>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function GamesToday() {
  const [sport, setSport] = useState('all');
  const [date, setDate] = useState(todayStr);
  const { games, loading, error, refetch } = useGames(sport, date);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Games</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        />
      </div>

      {/* Sport tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {SPORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSport(s.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              sport === s.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 hover:text-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorPanel message={`Failed to load games: ${error}`} onRetry={refetch} />
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Games grid */}
      {!loading && !error && games.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && games.length === 0 && (
        <EmptyState sport={sport} date={date} />
      )}
    </div>
  );
}
