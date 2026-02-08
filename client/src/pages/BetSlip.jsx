import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { betslipApi } from '../services/api';
import { formatOdds } from '../utils/odds';
import ConfidenceBadge from '../components/picks/ConfidenceBadge';
import ErrorPanel from '../components/common/ErrorPanel';
import { useToast } from '../components/common/Toast';

const BET_TYPE_LABELS = {
  spread: 'Spread',
  moneyline: 'Moneyline',
  over_under: 'Over/Under',
  player_prop: 'Player Prop',
};

const SPORT_LABELS = {
  nfl: 'NFL',
  ncaaf: 'NCAAF',
  nba: 'NBA',
  ncaab: 'NCAAB',
  mlb: 'MLB',
  nhl: 'NHL',
};

// ── Main Page ───────────────────────────────────────────────────────

export default function BetSlip() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | pending | settled
  const { addToast } = useToast();

  const fetchSlips = useCallback(() => {
    setLoading(true);
    setError(null);
    betslipApi
      .getAll()
      .then(setSlips)
      .catch((err) => {
        setError(err.message);
        addToast(`Failed to load bet slip: ${err.message}`, 'error');
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    fetchSlips();
  }, [fetchSlips]);

  function handleResult(id, result) {
    betslipApi
      .update(id, { result })
      .then((updated) => {
        setSlips((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        addToast(`Pick marked as ${result}`, 'success');
      })
      .catch((err) => addToast(`Failed to update: ${err.message}`, 'error'));
  }

  function handleRemove(id) {
    betslipApi
      .remove(id)
      .then(() => {
        setSlips((prev) => prev.filter((s) => s.id !== id));
        addToast('Pick removed', 'info');
      })
      .catch((err) => addToast(`Failed to remove: ${err.message}`, 'error'));
  }

  // Filter slips
  const filtered =
    filter === 'pending'
      ? slips.filter((s) => s.result === 'pending')
      : filter === 'settled'
        ? slips.filter((s) => s.result !== 'pending')
        : slips;

  // Stats
  const settled = slips.filter((s) => s.result !== 'pending');
  const wins = settled.filter((s) => s.result === 'won').length;
  const losses = settled.filter((s) => s.result === 'lost').length;
  const pushes = settled.filter((s) => s.result === 'push').length;
  const totalUnits = settled.reduce((sum, s) => sum + s.profit, 0);
  const totalWagered = settled.reduce((sum, s) => sum + s.units, 0);
  const roi = totalWagered > 0 ? (totalUnits / totalWagered) * 100 : 0;

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">My Bet Slip</h1>
          <p className="text-gray-500 text-sm">Track your picks and monitor results</p>
        </div>
        <ErrorPanel message={`Failed to load bet slip: ${error}`} onRetry={fetchSlips} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">My Bet Slip</h1>
        <p className="text-gray-500 text-sm">
          Track your picks and monitor results
        </p>
      </div>

      {/* Summary bar */}
      {slips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total Picks" value={slips.length} />
          <StatCard
            label="Record"
            value={`${wins}-${losses}${pushes > 0 ? `-${pushes}` : ''}`}
          />
          <StatCard
            label="Units +/-"
            value={`${totalUnits >= 0 ? '+' : ''}${totalUnits.toFixed(2)}`}
            color={totalUnits > 0 ? 'text-emerald-400' : totalUnits < 0 ? 'text-red-400' : 'text-white'}
          />
          <StatCard
            label="ROI"
            value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`}
            color={roi > 0 ? 'text-emerald-400' : roi < 0 ? 'text-red-400' : 'text-white'}
          />
          <StatCard
            label="Pending"
            value={slips.length - settled.length}
          />
        </div>
      )}

      {/* Filter tabs */}
      {slips.length > 0 && (
        <div className="flex gap-1 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Active' },
            { key: 'settled', label: 'Settled' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Slips list */}
      {slips.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No {filter} picks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((slip) => (
            <SlipCard
              key={slip.id}
              slip={slip}
              onResult={handleResult}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function SlipCard({ slip, onResult, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  const isPending = slip.result === 'pending';

  const resultStyles = {
    won: 'border-emerald-500/30 bg-emerald-500/5',
    lost: 'border-red-500/30 bg-red-500/5',
    push: 'border-amber-500/30 bg-amber-500/5',
    pending: 'border-gray-700/40',
  };

  const resultBadge = {
    won: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    lost: 'bg-red-500/15 text-red-400 ring-red-500/30',
    push: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  };

  return (
    <div
      className={`bg-gray-800/50 rounded-xl border p-4 transition-colors ${resultStyles[slip.result]}`}
    >
      <div className="flex gap-4">
        {/* Confidence */}
        {slip.confidence != null && (
          <div className="flex-shrink-0 pt-0.5">
            <ConfidenceBadge confidence={slip.confidence} size="lg" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            {slip.sport && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                {SPORT_LABELS[slip.sport] || slip.sport.toUpperCase()}
              </span>
            )}
            {slip.gameName && (
              <>
                <span className="text-[10px] text-gray-600">|</span>
                {slip.gameId && slip.sport ? (
                  <Link
                    to={`/games/${slip.sport}/${slip.gameId}`}
                    className="text-[11px] text-gray-500 hover:text-indigo-400 transition-colors truncate"
                  >
                    {slip.gameName}
                  </Link>
                ) : (
                  <span className="text-[11px] text-gray-500 truncate">
                    {slip.gameName}
                  </span>
                )}
              </>
            )}
            {!isPending && (
              <span
                className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ring-1 ${resultBadge[slip.result]}`}
              >
                {slip.result}
              </span>
            )}
          </div>

          {/* Pick */}
          <p className="text-sm font-semibold text-gray-100 mb-1.5">
            {slip.pick}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-3">
            <span className="text-gray-400">
              {BET_TYPE_LABELS[slip.bet_type] || slip.bet_type}
            </span>
            <span className="font-mono text-gray-300">
              {formatOdds(slip.odds)}
            </span>
            {slip.expected_value && (
              <span
                className={
                  parseFloat(slip.expected_value) > 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }
              >
                EV {slip.expected_value}
              </span>
            )}
            {slip.risk_tier && (
              <span
                className={
                  slip.risk_tier === 'low'
                    ? 'text-emerald-400'
                    : slip.risk_tier === 'medium'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }
              >
                {slip.risk_tier} risk
              </span>
            )}
            <span className="text-gray-500">{slip.units}u</span>
            {!isPending && (
              <span
                className={`font-mono font-medium ${
                  slip.profit > 0
                    ? 'text-emerald-400'
                    : slip.profit < 0
                      ? 'text-red-400'
                      : 'text-gray-400'
                }`}
              >
                {slip.profit > 0 ? '+' : ''}
                {slip.profit.toFixed(2)}u
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isPending ? (
              <>
                <ResultButton
                  label="Won"
                  color="bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => onResult(slip.id, 'won')}
                />
                <ResultButton
                  label="Lost"
                  color="bg-red-600 hover:bg-red-500"
                  onClick={() => onResult(slip.id, 'lost')}
                />
                <ResultButton
                  label="Push"
                  color="bg-amber-600 hover:bg-amber-500"
                  onClick={() => onResult(slip.id, 'push')}
                />
              </>
            ) : (
              <button
                onClick={() => onResult(slip.id, 'pending')}
                className="px-3 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                Reset
              </button>
            )}

            <div className="ml-auto">
              {confirming ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-red-400">Delete?</span>
                  <button
                    onClick={() => onRemove(slip.id)}
                    className="px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/15 rounded transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-300 rounded transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded"
                  title="Remove pick"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultButton({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors ${color}`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 px-4 py-4">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 py-16 text-center">
      <svg
        className="w-12 h-12 text-gray-700 mx-auto mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
      <p className="text-gray-400 font-medium mb-1">No picks yet</p>
      <p className="text-gray-600 text-sm mb-6">
        Run AI analysis on a game and add picks to your bet slip.
      </p>
      <Link
        to="/games"
        className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition-colors"
      >
        Browse Games
      </Link>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-7 w-40 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-56 bg-gray-800/60 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-800/50 rounded-xl border border-gray-700/40 px-4 py-4"
          >
            <div className="h-3 w-16 bg-gray-700 rounded mb-3" />
            <div className="h-7 w-10 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-800/50 rounded-xl border border-gray-700/40 p-4"
          >
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2.5">
                <div className="h-3 w-32 bg-gray-700 rounded" />
                <div className="h-4 w-48 bg-gray-700 rounded" />
                <div className="flex gap-3">
                  <div className="h-3 w-14 bg-gray-700 rounded" />
                  <div className="h-3 w-12 bg-gray-700 rounded" />
                  <div className="h-3 w-10 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
