import { Link } from 'react-router-dom';
import ConfidenceBadge from './ConfidenceBadge';
import { formatOddsDisplay } from '../../utils/odds';
import { useSettings } from '../../hooks/useSettings';

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

function PickCard({ pick, compact = false }) {
  const { settings } = useSettings();
  const {
    bet_type,
    pick: pickDesc,
    odds,
    confidence,
    expected_value,
    risk_tier,
    units,
    reasoning,
    gameName,
    gameId,
    sport,
  } = pick;

  const betAmount = units * (settings.startingBankroll * 0.01);
  const evNum = parseFloat(expected_value);
  const evPositive = evNum > 0;

  const riskColors = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  const content = (
    <div className="flex gap-4">
      {/* Confidence badge */}
      <div className="flex-shrink-0 pt-0.5">
        <ConfidenceBadge confidence={confidence} size={compact ? 'md' : 'lg'} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header: sport + game + bet type */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
            {SPORT_LABELS[sport] || sport?.toUpperCase()}
          </span>
          <span className="text-[10px] text-gray-600">|</span>
          <span className="text-[11px] text-gray-500 truncate">{gameName}</span>
        </div>

        {/* Pick description */}
        <p className="text-sm font-semibold text-gray-100 mb-1.5">{pickDesc}</p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-400">
            {BET_TYPE_LABELS[bet_type] || bet_type}
          </span>
          {odds && (
            <span className="font-mono text-gray-300">
              {formatOddsDisplay(odds, settings.oddsFormat)}
            </span>
          )}
          {expected_value && (
            <span className={evPositive ? 'text-emerald-400' : 'text-red-400'}>
              EV {expected_value}
            </span>
          )}
          <span className={riskColors[risk_tier] || 'text-gray-400'}>
            {risk_tier} risk
          </span>
          <span className="text-gray-500">
            {units}u
            {settings.startingBankroll > 0 && (
              <span className="text-gray-600 ml-1">(${betAmount.toFixed(0)})</span>
            )}
          </span>
        </div>

        {/* Reasoning preview */}
        {!compact && reasoning && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
            {reasoning}
          </p>
        )}
      </div>
    </div>
  );

  if (gameId && sport) {
    return (
      <Link
        to={`/games/${sport}/${gameId}`}
        className="block bg-gray-800/50 rounded-xl border border-gray-700/40 p-4 hover:border-indigo-500/40 hover:bg-gray-800/80 transition-all"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 p-4">
      {content}
    </div>
  );
}

export default PickCard;
