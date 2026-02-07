import { formatOddsBlock, formatInjuries, formatStats, formatSeasonStats } from './base.js';

const NCAAFB_INLINE_KEYS = [
  'totalYards', 'passingYards', 'rushingYards', 'turnovers',
  'firstDowns', 'thirdDownPct', 'penalties',
];

const NCAAFB_SEASON_KEYS = [
  'totalYards', 'yardsPerGame', 'passingYards', 'passingYardsPerGame',
  'rushingYards', 'rushingYardsPerGame', 'pointsFor', 'pointsAgainst',
  'turnoverDifferential', 'thirdDownConversionPct', 'redZoneScoringPct',
  'sacks', 'interceptions', 'fumblesLost', 'penaltyYards',
  'timeOfPossession',
];

/**
 * Build a College Football analysis prompt from aggregated game data.
 *
 * @param {object} game - Aggregated game object
 * @param {object} [detail] - Optional deep detail
 * @returns {string}
 */
export function buildPrompt(game, detail = null) {
  const { home, away, status, venue, odds, injuries } = game;

  let prompt = `SPORT: COLLEGE FOOTBALL (NCAAF)
MATCHUP: ${away.name} (${away.record || 'N/A'}) at ${home.name} (${home.record || 'N/A'})
DATE: ${game.date}
VENUE: ${venue?.name || 'Unknown'}, ${venue?.city || ''} ${venue?.state || ''}
STATUS: ${status?.detail || 'Scheduled'}

HOME/AWAY SPLITS:
  ${home.name}: Home ${home.homeRecord || 'N/A'} | Away ${home.awayRecord || 'N/A'}
  ${away.name}: Home ${away.homeRecord || 'N/A'} | Away ${away.awayRecord || 'N/A'}

`;

  if (Object.keys(home.stats || {}).length > 0) {
    prompt += `${home.name} GAME/RECENT STATS:\n${formatStats(home.stats, NCAAFB_INLINE_KEYS)}\n`;
    prompt += `${away.name} GAME/RECENT STATS:\n${formatStats(away.stats, NCAAFB_INLINE_KEYS)}\n`;
  }

  if (detail?.home?.seasonStats) {
    prompt += `${home.name} SEASON STATS:\n${formatSeasonStats(detail.home.seasonStats, NCAAFB_SEASON_KEYS)}\n`;
    prompt += `${away.name} SEASON STATS:\n${formatSeasonStats(detail.away.seasonStats, NCAAFB_SEASON_KEYS)}\n`;
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
KEY COLLEGE FOOTBALL FACTORS TO ANALYZE:
- Conference strength and strength of schedule
- Passing vs rushing balance (many CFB teams are run-heavy)
- Turnover differential — even more impactful than NFL due to talent gaps
- Red zone efficiency (points vs field goals)
- Third-down conversion rates
- Home field advantage is MASSIVE in CFB (3-4 points, even more at hostile venues)
- Talent disparity between programs (recruiting rankings)
- Transfer portal impact — new players adjusting to systems
- Coaching matchup and scheme advantages
- Weather for outdoor stadiums
- Rivalry/motivation factors
- Bowl game or playoff context

Analyze this college football game. Evaluate moneyline, spread, and over/under. Return your analysis as valid JSON.`;

  return prompt;
}
