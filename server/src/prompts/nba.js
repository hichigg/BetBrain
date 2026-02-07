import { formatOddsBlock, formatInjuries, formatStats, formatSeasonStats } from './base.js';

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

/**
 * Build an NBA analysis prompt from aggregated game data.
 *
 * @param {object} game - Aggregated game object from the aggregator
 * @param {object} [detail] - Optional deep detail from getGameDetail
 * @returns {string} The user prompt for Claude
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

  // Inline stats from scoreboard
  if (Object.keys(home.stats || {}).length > 0) {
    prompt += `${home.name} GAME/RECENT STATS:\n${formatStats(home.stats, NBA_INLINE_KEYS)}\n`;
    prompt += `${away.name} GAME/RECENT STATS:\n${formatStats(away.stats, NBA_INLINE_KEYS)}\n`;
  }

  // Deep season stats if available
  if (detail?.home?.seasonStats) {
    prompt += `${home.name} SEASON STATS:\n${formatSeasonStats(detail.home.seasonStats, NBA_SEASON_KEYS)}\n`;
    prompt += `${away.name} SEASON STATS:\n${formatSeasonStats(detail.away.seasonStats, NBA_SEASON_KEYS)}\n`;
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

Analyze this NBA game. Evaluate moneyline, spread, and over/under. Return your analysis as valid JSON.`;

  return prompt;
}
