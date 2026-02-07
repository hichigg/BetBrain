/**
 * Sport/league mappings for ESPN and The Odds API.
 *
 * Each key is a short sport identifier used throughout the app.
 * `espn` values map to ESPN's {sport}/{league} URL segments.
 * `oddsApi` values map to The Odds API sport keys.
 */
const SPORT_MAPPINGS = {
  nfl: {
    espn: { sport: 'football', league: 'nfl' },
    oddsApi: 'americanfootball_nfl',
    name: 'NFL',
  },
  ncaaf: {
    espn: { sport: 'football', league: 'college-football' },
    oddsApi: 'americanfootball_ncaaf',
    name: 'College Football',
  },
  nba: {
    espn: { sport: 'basketball', league: 'nba' },
    oddsApi: 'basketball_nba',
    name: 'NBA',
  },
  ncaab: {
    espn: { sport: 'basketball', league: 'mens-college-basketball' },
    oddsApi: 'basketball_ncaab',
    name: 'College Basketball',
  },
  mlb: {
    espn: { sport: 'baseball', league: 'mlb' },
    oddsApi: 'baseball_mlb',
    name: 'MLB',
  },
  nhl: {
    espn: { sport: 'hockey', league: 'nhl' },
    oddsApi: 'icehockey_nhl',
    name: 'NHL',
  },
};

/**
 * Look up ESPN path segments for a sport key.
 * @param {string} sportKey - e.g. 'nba', 'nfl'
 * @returns {{ sport: string, league: string } | null}
 */
export function getEspnMapping(sportKey) {
  return SPORT_MAPPINGS[sportKey]?.espn ?? null;
}

/**
 * Look up The Odds API sport key for a sport key.
 * @param {string} sportKey - e.g. 'nba', 'nfl'
 * @returns {string | null}
 */
export function getOddsApiKey(sportKey) {
  return SPORT_MAPPINGS[sportKey]?.oddsApi ?? null;
}

/**
 * Get all supported sport keys.
 * @returns {string[]}
 */
export function getSupportedSports() {
  return Object.keys(SPORT_MAPPINGS);
}

export default SPORT_MAPPINGS;
