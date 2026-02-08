import { formatOddsBlock, formatInjuries, formatStats, formatSeasonStats, formatPlayerStats } from './base.js';

const MLB_INLINE_KEYS = [
  'runs', 'hits', 'errors', 'homeRuns', 'strikeouts',
  'walks', 'battingAverage', 'onBasePct',
];

const MLB_SEASON_KEYS = [
  'runs', 'battingAverage', 'onBasePct', 'sluggingPct', 'OPS',
  'homeRuns', 'stolenBases', 'strikeouts', 'walks',
  'ERA', 'WHIP', 'strikeoutsPerNine', 'walksPerNine',
  'qualityStarts', 'saves', 'blownSaves',
  'fieldingPct', 'errors', 'runsPerGame',
];

export const PLAYER_STAT_LABELS = {
  hits: 'H', home_runs: 'HR', rbi: 'RBI', batting_avg: 'AVG',
  obp: 'OBP', slg: 'SLG', stolen_bases: 'SB', strikeouts: 'K',
  era: 'ERA', whip: 'WHIP',
};

export function buildPrompt(game, detail = null) {
  const { home, away, status, venue, odds, injuries } = game;

  let prompt = `SPORT: MLB
MATCHUP: ${away.name} (${away.record || 'N/A'}) at ${home.name} (${home.record || 'N/A'})
DATE: ${game.date}
VENUE: ${venue?.name || 'Unknown'}, ${venue?.city || ''} ${venue?.state || ''}
STATUS: ${status?.detail || 'Scheduled'}

HOME/AWAY SPLITS:
  ${home.name}: Home ${home.homeRecord || 'N/A'} | Away ${home.awayRecord || 'N/A'}
  ${away.name}: Home ${away.homeRecord || 'N/A'} | Away ${away.awayRecord || 'N/A'}

`;

  if (Object.keys(home.stats || {}).length > 0) {
    prompt += `${home.name} GAME/RECENT STATS:\n${formatStats(home.stats, MLB_INLINE_KEYS)}\n`;
    prompt += `${away.name} GAME/RECENT STATS:\n${formatStats(away.stats, MLB_INLINE_KEYS)}\n`;
  }

  if (detail?.home?.seasonStats) {
    prompt += `${home.name} SEASON STATS:\n${formatSeasonStats(detail.home.seasonStats, MLB_SEASON_KEYS)}\n`;
    prompt += `${away.name} SEASON STATS:\n${formatSeasonStats(detail.away.seasonStats, MLB_SEASON_KEYS)}\n`;
  }

  if (game.homePlayers?.length) {
    prompt += formatPlayerStats(game.homePlayers, home.name, PLAYER_STAT_LABELS);
  }
  if (game.awayPlayers?.length) {
    prompt += formatPlayerStats(game.awayPlayers, away.name, PLAYER_STAT_LABELS);
  }

  prompt += `ODDS:\n${formatOddsBlock(odds)}\n`;
  prompt += formatInjuries(injuries?.home, home.name);
  prompt += formatInjuries(injuries?.away, away.name);

  if (detail?.leaders?.length) {
    prompt += '\nGAME LEADERS:\n';
    for (const cat of detail.leaders) {
      prompt += `  ${cat.category}: ${cat.leaders?.map((l) => `${l.name} (${l.team}) ${l.value}`).join(', ')}\n`;
    }
  }

  prompt += `
KEY MLB FACTORS TO ANALYZE:
- Starting pitching matchup (ERA, WHIP, K/9, BB/9, recent form)
- Bullpen strength and availability (recent usage, save/blown save ratio)
- Team batting average, OBP, SLG, and OPS
- Home run power and park factors (hitter-friendly vs pitcher-friendly)
- Lefty/righty splits for key batters and the starting pitcher
- Run scoring trends (last 10 games runs per game)
- Defensive metrics (fielding %, errors)
- Weather and wind direction at outdoor parks
- Umpire tendencies if data available
- Day vs night splits, travel schedule

PLAYER PROPS TO CONSIDER:
If player data is available, evaluate props for key performers:
- Starting pitcher strikeouts (K total over/under)
- Batter hits (total bases, hits over/under)
- Home runs for power hitters vs vulnerable pitchers
Only recommend player props where the data shows a clear edge.

Analyze this MLB game. Evaluate moneyline, run line (spread), over/under, and player props. Return your analysis as valid JSON.`;

  return prompt;
}
