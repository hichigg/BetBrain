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
    oddsApiIo: { sport: 'american-football', league: 'usa-nfl' },
    name: 'NFL',
  },
  ncaaf: {
    espn: { sport: 'football', league: 'college-football' },
    oddsApi: 'americanfootball_ncaaf',
    oddsApiIo: { sport: 'american-football', league: 'usa-ncaa-regular-season' },
    name: 'College Football',
  },
  nba: {
    espn: { sport: 'basketball', league: 'nba' },
    oddsApi: 'basketball_nba',
    oddsApiIo: { sport: 'basketball', league: 'usa-nba' },
    name: 'NBA',
  },
  ncaab: {
    espn: { sport: 'basketball', league: 'mens-college-basketball' },
    oddsApi: 'basketball_ncaab',
    oddsApiIo: { sport: 'basketball', league: 'usa-ncaa-regular-season' },
    name: 'College Basketball',
  },
  mlb: {
    espn: { sport: 'baseball', league: 'mlb' },
    oddsApi: 'baseball_mlb',
    oddsApiIo: { sport: 'baseball', league: 'usa-mlb' },
    name: 'MLB',
  },
  nhl: {
    espn: { sport: 'hockey', league: 'nhl' },
    oddsApi: 'icehockey_nhl',
    oddsApiIo: { sport: 'ice-hockey', league: 'usa-nhl' },
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
