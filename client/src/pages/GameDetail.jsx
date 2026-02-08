import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gamesApi, picksApi, betslipApi } from '../services/api';
import { formatOdds } from '../utils/odds';
import OddsComparisonTable from '../components/game/OddsComparisonTable';
import TeamComparison from '../components/game/TeamComparison';
import ConfidenceBadge from '../components/picks/ConfidenceBadge';
import ErrorPanel from '../components/common/ErrorPanel';
import { useToast } from '../components/common/Toast';

const BET_TYPE_LABELS = {
  spread: 'Spread',
  moneyline: 'Moneyline',
  over_under: 'Over/Under',
  player_prop: 'Player Prop',
};

// ── Main Page ───────────────────────────────────────────────────────

export default function GameDetail() {
  const { sport, gameId } = useParams();
  const [game, setGame] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { addToast } = useToast();

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Fetch game detail
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    gamesApi
      .getDetail(sport, gameId)
      .then((data) => {
        if (!cancelled) setGame(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sport, gameId, refreshKey]);

  // Trigger analysis
  function runAnalysis() {
    setAnalyzing(true);
    setAnalysisError(null);
    picksApi
      .analyze({ sport, gameId })
      .then((data) => setAnalysis(data))
      .catch((err) => {
        setAnalysisError(err.message);
        addToast(`Analysis failed: ${err.message}`, 'error');
      })
      .finally(() => setAnalyzing(false));
  }

  if (loading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="text-center py-20">
        <ErrorPanel message={`Failed to load game: ${error}`} onRetry={refetch} />
        <Link to="/games" className="text-indigo-400 text-sm mt-4 inline-block hover:underline">
          Back to games
        </Link>
      </div>
    );
  }
  if (!game) return null;

  const { home, away, venue, status, date } = game;

  return (
    <div>
      {/* Back link */}
      <Link to="/games" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block">
        &larr; Back to games
      </Link>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/40 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Away team */}
          <div className="flex items-center gap-3 flex-1 justify-end sm:justify-end">
            <div className="text-right">
              <p className="font-semibold text-gray-100">{away.name}</p>
              <p className="text-xs text-gray-500">{away.record}</p>
            </div>
            {away.logo && <img src={away.logo} alt="" className="w-14 h-14 object-contain" />}
          </div>

          {/* Center info */}
          <div className="text-center flex-shrink-0 px-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">
              {sport?.toUpperCase()}
            </p>
            <p className="text-xs text-gray-500">
              {status?.detail || formatGameTime(date)}
            </p>
            {venue && (
              <p className="text-[11px] text-gray-600 mt-1">
                {venue.name}{venue.city ? `, ${venue.city}` : ''}
              </p>
            )}
          </div>

          {/* Home team */}
          <div className="flex items-center gap-3 flex-1 justify-start sm:justify-start">
            {home.logo && <img src={home.logo} alt="" className="w-14 h-14 object-contain" />}
            <div>
              <p className="font-semibold text-gray-100">{home.name}</p>
              <p className="text-xs text-gray-500">{home.record}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Odds + Analysis ────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Odds Comparison */}
          <Section title="Odds Comparison">
            <OddsComparisonTable
              odds={game.odds}
              homeName={home.name}
              awayName={away.name}
            />
          </Section>

          {/* AI Analysis */}
          <Section
            title="AI Analysis"
            action={
              !analysis && (
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-wait transition-colors"
                >
                  {analyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              )
            }
          >
            {analyzing && <AnalysisProgress />}
            {!analyzing && analysisError && (
              <ErrorPanel message={analysisError} onRetry={runAnalysis} />
            )}
            {!analyzing && !analysis && !analysisError && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  Click "Run Analysis" to get AI-powered recommendations for this game.
                </p>
              </div>
            )}
            {analysis && (
              <div>
                {analysis.game_summary && (
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    {analysis.game_summary}
                  </p>
                )}
                {analysis.recommendations?.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.recommendations.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} sport={sport} gameId={gameId} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No value bets found for this game.
                  </p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── Right column: Stats + Injuries ──────────────── */}
        <div className="space-y-6">
          {/* Team Comparison */}
          <Section title="Team Stats">
            <TeamComparison home={home} away={away} sport={sport} />
          </Section>

          {/* Injuries */}
          {(game.injuries?.home?.length > 0 || game.injuries?.away?.length > 0) && (
            <Section title="Injury Report">
              {game.injuries.away?.length > 0 && (
                <InjuryList team={away.name} injuries={game.injuries.away} />
              )}
              {game.injuries.home?.length > 0 && (
                <InjuryList team={home.name} injuries={game.injuries.home} />
              )}
              {game.injuries.home?.length === 0 && game.injuries.away?.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No injuries reported</p>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Section({ title, action, children }) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/30">
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function RecommendationCard({ rec, sport, gameId }) {
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const { addToast } = useToast();

  const evNum = parseFloat(rec.expected_value);
  const evPositive = evNum > 0;

  const riskColors = {
    low: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    high: 'bg-red-500/10 text-red-400 ring-red-500/20',
  };

  function addToBetSlip() {
    betslipApi
      .add({ ...rec, sport, gameId })
      .then(() => {
        setAdded(true);
        addToast('Pick added to bet slip', 'success');
      })
      .catch((err) => addToast(`Failed to add: ${err.message}`, 'error'));
  }

  return (
    <div className="bg-gray-900/50 rounded-lg border border-gray-700/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-gray-800/30 transition-colors"
      >
        <ConfidenceBadge confidence={rec.confidence} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100 mb-1">{rec.pick}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-gray-500">{BET_TYPE_LABELS[rec.bet_type] || rec.bet_type}</span>
            {rec.odds && (
              <span className="font-mono text-gray-300">
                {typeof rec.odds === 'number' ? formatOdds(rec.odds) : rec.odds}
              </span>
            )}
            {rec.expected_value && (
              <span className={evPositive ? 'text-emerald-400' : 'text-red-400'}>
                EV {rec.expected_value}
              </span>
            )}
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ${riskColors[rec.risk_tier] || ''}`}>
              {rec.risk_tier}
            </span>
            <span className="text-gray-500">{rec.units}u</span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800/50">
          {/* Confidence bar */}
          <div className="mt-3 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Confidence</span>
              <span className="text-xs text-gray-400">{rec.confidence}/10</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  rec.confidence >= 8
                    ? 'bg-emerald-500'
                    : rec.confidence >= 5
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${rec.confidence * 10}%` }}
              />
            </div>
          </div>

          {/* Full reasoning */}
          <p className="text-sm text-gray-400 leading-relaxed mb-4">{rec.reasoning}</p>

          {/* Add to bet slip */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToBetSlip();
            }}
            disabled={added}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              added
                ? 'bg-emerald-600/20 text-emerald-400 cursor-default'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {added ? 'Added to Bet Slip' : 'Add to Bet Slip'}
          </button>
        </div>
      )}
    </div>
  );
}

function InjuryList({ team, injuries }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{team}</p>
      <div className="space-y-1.5">
        {injuries.map((inj, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-300">{inj.name}</span>
              {inj.position && (
                <span className="text-[10px] text-gray-600">{inj.position}</span>
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                inj.status === 'Out'
                  ? 'text-red-400'
                  : inj.status === 'Doubtful'
                    ? 'text-orange-400'
                    : inj.status === 'Questionable'
                      ? 'text-amber-400'
                      : 'text-gray-400'
              }`}
            >
              {inj.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatGameTime(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// ── Skeletons ───────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-gray-800 rounded mb-6" />
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/40 p-6 mb-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gray-700 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-700 rounded" />
              <div className="h-3 w-16 bg-gray-700 rounded" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <div className="h-3 w-10 bg-gray-700 rounded mx-auto" />
            <div className="h-3 w-20 bg-gray-700 rounded mx-auto" />
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-700 rounded" />
              <div className="h-3 w-16 bg-gray-700 rounded" />
            </div>
            <div className="w-14 h-14 bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-gray-800/50 rounded-xl border border-gray-700/40" />
        <div className="h-64 bg-gray-800/50 rounded-xl border border-gray-700/40" />
      </div>
    </div>
  );
}

const ANALYSIS_STEPS = [
  { label: 'Gathering team stats and odds data...', target: 15 },
  { label: 'Analyzing matchup factors...', target: 35 },
  { label: 'Evaluating betting markets...', target: 55 },
  { label: 'Running Claude AI model...', target: 75 },
  { label: 'Generating recommendations...', target: 90 },
];

function AnalysisProgress() {
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    let frame;
    let start = Date.now();

    function tick() {
      const elapsed = Date.now() - start;
      // Fast start, slows down — asymptotically approaches 92%
      const next = Math.min(92, 92 * (1 - Math.exp(-elapsed / 8000)));
      setProgress(next);

      // Advance step label based on progress
      const idx = ANALYSIS_STEPS.findIndex((s) => next < s.target);
      setStepIdx(idx === -1 ? ANALYSIS_STEPS.length - 1 : Math.max(0, idx));

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const step = ANALYSIS_STEPS[stepIdx];
  const barColor =
    progress < 40
      ? 'bg-indigo-500'
      : progress < 70
        ? 'bg-indigo-400'
        : 'bg-emerald-500';

  return (
    <div className="py-6 px-2">
      {/* Step label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-gray-400">{step.label}</span>
        </div>
        <span className="text-xs font-mono text-gray-500">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mt-4">
        {ANALYSIS_STEPS.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                progress >= s.target
                  ? 'bg-emerald-500'
                  : i === stepIdx
                    ? 'bg-indigo-400 animate-pulse'
                    : 'bg-gray-700'
              }`}
            />
            <span
              className={`text-[10px] hidden sm:block transition-colors duration-300 ${
                i === stepIdx ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {s.label.replace('...', '').split(' ').slice(0, 2).join(' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
