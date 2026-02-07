import { formatOddsBlock, formatInjuries, formatStats, formatSeasonStats } from './base.js';

const NCAAMB_INLINE_KEYS = [
  'avgPoints', 'points', 'avgRebounds', 'rebounds', 'avgAssists', 'assists',
  'fieldGoalPct', 'threePointFieldGoalPct', 'freeThrowPct',
];

const NCAAMB_SEASON_KEYS = [
  'avgPoints', 'avgRebounds', 'avgAssists', 'avgSteals', 'avgBlocks',
  'avgTurnovers', 'fieldGoalPct', 'threePointFieldGoalPct', 'freeThrowPct',
  'offensiveRebounds', 'defensiveRebounds', 'assistTurnoverRatio',
  'avgFouls',
];

/**
 * Build a College Basketball analysis prompt from aggregated game data.
 *
 * @param {object} game - Aggregated game object
 * @param {object} [detail] - Optional deep detail
 * @returns {string}
 */
export function buildPrompt(game, detail = null) {
  const { home, away, status, venue, odds, injuries } = game;

  let prompt = `SPORT: COLLEGE BASKETBALL (NCAAB)
MATCHUP: ${away.name} (${away.record || 'N/A'}) at ${home.name} (${home.record || 'N/A'})
DATE: ${game.date}
VENUE: ${venue?.name || 'Unknown'}, ${venue?.city || ''} ${venue?.state || ''}
STATUS: ${status?.detail || 'Scheduled'}

HOME/AWAY SPLITS:
  ${home.name}: Home ${home.homeRecord || 'N/A'} | Away ${home.awayRecord || 'N/A'}
  ${away.name}: Home ${away.homeRecord || 'N/A'} | Away ${away.awayRecord || 'N/A'}

`;

  if (Object.keys(home.stats || {}).length > 0) {
    prompt += `${home.name} GAME/RECENT STATS:\n${formatStats(home.stats, NCAAMB_INLINE_KEYS)}\n`;
    prompt += `${away.name} GAME/RECENT STATS:\n${formatStats(away.stats, NCAAMB_INLINE_KEYS)}\n`;
  }

  if (detail?.home?.seasonStats) {
    prompt += `${home.name} SEASON STATS:\n${formatSeasonStats(detail.home.seasonStats, NCAAMB_SEASON_KEYS)}\n`;
    prompt += `${away.name} SEASON STATS:\n${formatSeasonStats(detail.away.seasonStats, NCAAMB_SEASON_KEYS)}\n`;
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
KEY COLLEGE BASKETBALL FACTORS TO ANALYZE:
- Tempo and pace of play (possessions per game) — huge variance in CBB
- Offensive and defensive efficiency (points per possession)
- 3-point shooting volume and percentage (more variance than NBA)
- Rebounding differential (offensive boards = extra possessions)
- Turnover rate and assist-to-turnover ratio
- Free throw rate and accuracy (critical in close games)
- Home court advantage is HUGE in CBB (4-5 points, elite venues even more)
- Conference play vs non-conference strength
- Key player dependency — many CBB teams rely heavily on 1-2 stars
- Foul trouble risk for key players
- Experience (upperclassmen vs freshmen-heavy)
- Tournament/rivalry motivation factors

Analyze this college basketball game. Evaluate moneyline, spread, and over/under. Return your analysis as valid JSON.`;

  return prompt;
}
