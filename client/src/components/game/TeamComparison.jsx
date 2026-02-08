const SPORT_STAT_KEYS = {
  nba: [
    { key: 'record', label: 'Record' },
    { key: 'avgPoints', label: 'PPG' },
    { key: 'fieldGoalPct', label: 'FG%' },
    { key: 'threePointFieldGoalPct', label: '3PT%' },
    { key: 'freeThrowPct', label: 'FT%' },
    { key: 'avgRebounds', label: 'RPG' },
    { key: 'avgAssists', label: 'APG' },
    { key: 'avgSteals', label: 'SPG' },
    { key: 'avgBlocks', label: 'BPG' },
    { key: 'avgTurnovers', label: 'TOPG' },
    { key: 'assistTurnoverRatio', label: 'AST/TO' },
  ],
  ncaab: [
    { key: 'record', label: 'Record' },
    { key: 'avgPoints', label: 'PPG' },
    { key: 'fieldGoalPct', label: 'FG%' },
    { key: 'threePointFieldGoalPct', label: '3PT%' },
    { key: 'freeThrowPct', label: 'FT%' },
    { key: 'avgRebounds', label: 'RPG' },
    { key: 'avgAssists', label: 'APG' },
    { key: 'avgTurnovers', label: 'TOPG' },
  ],
  nfl: [
    { key: 'record', label: 'Record' },
    { key: 'totalYards', label: 'Total YDS' },
    { key: 'passingYards', label: 'Pass YDS' },
    { key: 'rushingYards', label: 'Rush YDS' },
    { key: 'pointsFor', label: 'PF' },
    { key: 'pointsAgainst', label: 'PA' },
    { key: 'turnoverDifferential', label: 'TO Diff' },
    { key: 'thirdDownConversionPct', label: '3rd Down%' },
    { key: 'redZoneScoringPct', label: 'Red Zone%' },
  ],
  ncaaf: [
    { key: 'record', label: 'Record' },
    { key: 'totalYards', label: 'Total YDS' },
    { key: 'passingYards', label: 'Pass YDS' },
    { key: 'rushingYards', label: 'Rush YDS' },
    { key: 'pointsFor', label: 'PF' },
    { key: 'pointsAgainst', label: 'PA' },
    { key: 'turnoverDifferential', label: 'TO Diff' },
  ],
  mlb: [
    { key: 'record', label: 'Record' },
    { key: 'battingAverage', label: 'AVG' },
    { key: 'onBasePct', label: 'OBP' },
    { key: 'sluggingPct', label: 'SLG' },
    { key: 'homeRuns', label: 'HR' },
    { key: 'ERA', label: 'ERA' },
    { key: 'WHIP', label: 'WHIP' },
    { key: 'strikeouts', label: 'K' },
    { key: 'runs', label: 'Runs' },
  ],
  nhl: [
    { key: 'record', label: 'Record' },
    { key: 'goalsForPerGame', label: 'GF/G' },
    { key: 'goalsAgainstPerGame', label: 'GA/G' },
    { key: 'powerPlayPct', label: 'PP%' },
    { key: 'penaltyKillPct', label: 'PK%' },
    { key: 'shotsForPerGame', label: 'SOG/G' },
    { key: 'savePct', label: 'SV%' },
    { key: 'faceOffWinPct', label: 'FO%' },
  ],
};

function getStat(team, key) {
  if (key === 'record') return team.record || '—';
  // Try seasonStats first (from detail), then inline stats
  const season = team.seasonStats?.[key];
  if (season) return season.displayValue || season.value || '—';
  const inline = team.stats?.[key];
  if (inline !== undefined) return inline;
  return '—';
}

function compareValues(awayVal, homeVal) {
  const a = parseFloat(awayVal);
  const b = parseFloat(homeVal);
  if (isNaN(a) || isNaN(b) || a === b) return { away: '', home: '' };
  return {
    away: a > b ? 'text-emerald-400' : '',
    home: b > a ? 'text-emerald-400' : '',
  };
}

export default function TeamComparison({ home, away, sport }) {
  const statKeys = SPORT_STAT_KEYS[sport] || SPORT_STAT_KEYS.nba;

  return (
    <div>
      {/* Team headers */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <div className="text-center">
          {away.logo && <img src={away.logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />}
          <p className="text-sm font-semibold text-gray-200">{away.shortName || away.name}</p>
          <p className="text-xs text-gray-500">{away.record}</p>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-xs text-gray-600 uppercase tracking-widest">vs</span>
        </div>
        <div className="text-center">
          {home.logo && <img src={home.logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />}
          <p className="text-sm font-semibold text-gray-200">{home.shortName || home.name}</p>
          <p className="text-xs text-gray-500">{home.record}</p>
        </div>
      </div>

      {/* Stat rows */}
      <div className="divide-y divide-gray-800/40">
        {statKeys.map(({ key, label }) => {
          const awayVal = getStat(away, key);
          const homeVal = getStat(home, key);
          const colors = key === 'record' ? { away: '', home: '' } : compareValues(awayVal, homeVal);

          return (
            <div key={key} className="grid grid-cols-3 gap-2 sm:gap-4 py-2 sm:py-2.5">
              <div className={`text-sm text-right font-mono ${colors.away}`}>
                {awayVal}
              </div>
              <div className="text-center text-xs text-gray-500 self-center">
                {label}
              </div>
              <div className={`text-sm text-left font-mono ${colors.home}`}>
                {homeVal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
