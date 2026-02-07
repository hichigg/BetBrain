import { formatOddsBlock, formatInjuries, formatStats, formatSeasonStats } from './base.js';

const NHL_INLINE_KEYS = [
  'goals', 'shots', 'powerPlayGoals', 'powerPlayOpportunities',
  'penaltyMinutes', 'hits', 'blockedShots', 'faceOffWinPct',
];

const NHL_SEASON_KEYS = [
  'goalsFor', 'goalsAgainst', 'goalsForPerGame', 'goalsAgainstPerGame',
  'shotsForPerGame', 'shotsAgainstPerGame',
  'powerPlayPct', 'penaltyKillPct',
  'faceOffWinPct', 'shootingPct', 'savePct',
  'hits', 'blockedShots', 'takeaways', 'giveaways',
  'overtimeLosses', 'pointPct',
];

/**
 * Build an NHL analysis prompt from aggregated game data.
 *
 * @param {object} game - Aggregated game object
 * @param {object} [detail] - Optional deep detail
 * @returns {string}
 */
export function buildPrompt(game, detail = null) {
  const { home, away, status, venue, odds, injuries } = game;

  let prompt = `SPORT: NHL
MATCHUP: ${away.name} (${away.record || 'N/A'}) at ${home.name} (${home.record || 'N/A'})
DATE: ${game.date}
VENUE: ${venue?.name || 'Unknown'}, ${venue?.city || ''} ${venue?.state || ''}
STATUS: ${status?.detail || 'Scheduled'}

HOME/AWAY SPLITS:
  ${home.name}: Home ${home.homeRecord || 'N/A'} | Away ${home.awayRecord || 'N/A'}
  ${away.name}: Home ${away.homeRecord || 'N/A'} | Away ${away.awayRecord || 'N/A'}

`;

  if (Object.keys(home.stats || {}).length > 0) {
    prompt += `${home.name} GAME/RECENT STATS:\n${formatStats(home.stats, NHL_INLINE_KEYS)}\n`;
    prompt += `${away.name} GAME/RECENT STATS:\n${formatStats(away.stats, NHL_INLINE_KEYS)}\n`;
  }

  if (detail?.home?.seasonStats) {
    prompt += `${home.name} SEASON STATS:\n${formatSeasonStats(detail.home.seasonStats, NHL_SEASON_KEYS)}\n`;
    prompt += `${away.name} SEASON STATS:\n${formatSeasonStats(detail.away.seasonStats, NHL_SEASON_KEYS)}\n`;
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
KEY NHL FACTORS TO ANALYZE:
- Goaltender matchup (save %, GAA, recent form, home/away splits)
- 5v5 scoring rates and shot differentials (Corsi/Fenwick proxy: shots for vs against)
- Power play efficiency vs penalty kill efficiency
- Goals for/against per game trends (last 10 games)
- Face-off win percentage (puck possession indicator)
- Shot blocking and physical play (hits, blocked shots)
- Back-to-back games and travel schedule
- Home ice advantage (typically 0.2-0.3 goals in NHL)
- Key injuries to top-6 forwards, top-4 defensemen, and starting goalie
- Special teams performance trends

Analyze this NHL game. Evaluate moneyline, puck line (spread), and over/under. Return your analysis as valid JSON.`;

  return prompt;
}
