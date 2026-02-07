import { formatOddsBlock, formatInjuries, formatStats, formatSeasonStats } from './base.js';

const NFL_INLINE_KEYS = [
  'totalYards', 'passingYards', 'rushingYards', 'turnovers',
  'firstDowns', 'thirdDownPct', 'penalties',
];

const NFL_SEASON_KEYS = [
  'totalYards', 'yardsPerGame', 'passingYards', 'passingYardsPerGame',
  'rushingYards', 'rushingYardsPerGame', 'pointsFor', 'pointsAgainst',
  'turnoverDifferential', 'thirdDownConversionPct', 'redZoneScoringPct',
  'sacks', 'interceptions', 'fumblesLost', 'penaltyYards',
  'timeOfPossession', 'firstDownsPerGame',
];

/**
 * Build an NFL analysis prompt from aggregated game data.
 *
 * @param {object} game - Aggregated game object
 * @param {object} [detail] - Optional deep detail
 * @returns {string}
 */
export function buildPrompt(game, detail = null) {
  const { home, away, status, venue, odds, injuries } = game;

  let prompt = `SPORT: NFL
MATCHUP: ${away.name} (${away.record || 'N/A'}) at ${home.name} (${home.record || 'N/A'})
DATE: ${game.date}
VENUE: ${venue?.name || 'Unknown'}, ${venue?.city || ''} ${venue?.state || ''}
STATUS: ${status?.detail || 'Scheduled'}

HOME/AWAY SPLITS:
  ${home.name}: Home ${home.homeRecord || 'N/A'} | Away ${home.awayRecord || 'N/A'}
  ${away.name}: Home ${away.homeRecord || 'N/A'} | Away ${away.awayRecord || 'N/A'}

`;

  if (Object.keys(home.stats || {}).length > 0) {
    prompt += `${home.name} GAME/RECENT STATS:\n${formatStats(home.stats, NFL_INLINE_KEYS)}\n`;
    prompt += `${away.name} GAME/RECENT STATS:\n${formatStats(away.stats, NFL_INLINE_KEYS)}\n`;
  }

  if (detail?.home?.seasonStats) {
    prompt += `${home.name} SEASON STATS:\n${formatSeasonStats(detail.home.seasonStats, NFL_SEASON_KEYS)}\n`;
    prompt += `${away.name} SEASON STATS:\n${formatSeasonStats(detail.away.seasonStats, NFL_SEASON_KEYS)}\n`;
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
KEY NFL FACTORS TO ANALYZE:
- Passing offense vs pass defense (yards, completion %, pressure rate)
- Rushing attack vs run defense (yards per carry, stuff rate)
- Turnover differential — the #1 predictor of NFL outcomes
- Red zone efficiency (scoring % inside the 20)
- Third-down conversion rates (sustaining drives)
- Time of possession and play volume
- Home field advantage (typically 2.5-3 points in NFL)
- Weather impact if outdoor venue
- Key injuries to QB, OL, and top defensive players
- Divisional rivalries and schedule spots (trap games, letdown, lookahead)

Analyze this NFL game. Evaluate moneyline, spread, and over/under. Return your analysis as valid JSON.`;

  return prompt;
}
