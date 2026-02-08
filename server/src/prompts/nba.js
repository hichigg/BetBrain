import { formatOddsBlock, formatInjuries, formatStats, formatSeasonStats, formatPlayerStats } from './base.js';

const NBA_INLINE_KEYS = [
  'avgPoints', 'points', 'avgRebounds', 'rebounds', 'avgAssists', 'assists',
  'fieldGoalPct', 'threePointFieldGoalPct', 'freeThrowPct',
];

const NBA_SEASON_KEYS = [
  'avgPoints', 'avgRebounds', 'avgAssists', 'avgSteals', 'avgBlocks',
  'avgTurnovers', 'fieldGoalPct', 'threePointFieldGoalPct', 'freeThrowPct',
  'offensiveRebounds', 'defensiveRebounds', 'assistTurnoverRatio',
  'avgFouls', 'plusMinus',
];

export const PLAYER_STAT_LABELS = {
  pts: 'PPG', reb: 'RPG', ast: 'APG', stl: 'SPG', blk: 'BPG',
  fg_pct: 'FG%', fg3_pct: '3PT%', ft_pct: 'FT%', turnover: 'TO', min: 'MIN',
};

/**
 * Build an NBA analysis prompt from aggregated game data.
 */
export function buildPrompt(game, detail = null) {
  const { home, away, status, venue, odds, injuries } = game;

  let prompt = `SPORT: NBA
MATCHUP: ${away.name} (${away.record || 'N/A'}) at ${home.name} (${home.record || 'N/A'})
DATE: ${game.date}
VENUE: ${venue?.name || 'Unknown'}, ${venue?.city || ''} ${venue?.state || ''}
STATUS: ${status?.detail || 'Scheduled'}

HOME/AWAY SPLITS:
  ${home.name}: Home ${home.homeRecord || 'N/A'} | Away ${home.awayRecord || 'N/A'}
  ${away.name}: Home ${away.homeRecord || 'N/A'} | Away ${away.awayRecord || 'N/A'}

`;

  if (Object.keys(home.stats || {}).length > 0) {
    prompt += `${home.name} GAME/RECENT STATS:\n${formatStats(home.stats, NBA_INLINE_KEYS)}\n`;
    prompt += `${away.name} GAME/RECENT STATS:\n${formatStats(away.stats, NBA_INLINE_KEYS)}\n`;
  }

  if (detail?.home?.seasonStats) {
    prompt += `${home.name} SEASON STATS:\n${formatSeasonStats(detail.home.seasonStats, NBA_SEASON_KEYS)}\n`;
    prompt += `${away.name} SEASON STATS:\n${formatSeasonStats(detail.away.seasonStats, NBA_SEASON_KEYS)}\n`;
  }

  // Player-level data
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
KEY NBA FACTORS TO ANALYZE:
- Pace and offensive/defensive efficiency
- 3-point shooting volume and accuracy trends
- Rebounding differential (offensive boards = second-chance points)
- Turnover differential and assist-to-turnover ratio
- Free throw rate and shooting from the line
- Home court advantage (typically 2-3 points in NBA)
- Back-to-back or rest day advantage
- Key player injuries and their impact on rotations

PLAYER PROPS TO CONSIDER:
If player data is available above, evaluate player props for the top performers:
- Points (over/under their season average based on matchup and pace)
- Rebounds (especially vs poor rebounding teams)
- Assists (especially vs teams that allow high assist rates)
- Combined PRA (points + rebounds + assists)
Only recommend player props where the data shows a clear edge.

Analyze this NBA game. Evaluate moneyline, spread, over/under, and player props. Return your analysis as valid JSON.`;

  return prompt;
}
