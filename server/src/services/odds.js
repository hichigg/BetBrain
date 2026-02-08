import { getOrFetch, keys, TTL } from './cache.js';
import fetchWithTimeout, { TIMEOUTS } from '../utils/fetchWithTimeout.js';

const BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.ODDS_API_KEY;
const DEFAULT_MARKETS = 'h2h,spreads,totals';
const REGION = 'us';
const ODDS_FORMAT = 'american';

/** Tracks API usage from response headers */
let requestsRemaining = null;
let requestsUsed = null;

/**
 * Internal helper — fetches JSON from The Odds API, tracks usage headers.
 * Returns null on failure instead of throwing.
 * @param {string} url
 * @returns {Promise<object | null>}
 */
async function fetchOdds(url) {
  if (!API_KEY) {
    console.error('Odds API: ODDS_API_KEY is not set');
    return null;
  }

  try {
    const res = await fetchWithTimeout(url, {}, TIMEOUTS.ODDS);

    // Track usage from response headers
    const remaining = res.headers.get('x-requests-remaining');
    const used = res.headers.get('x-requests-used');
    if (remaining !== null) requestsRemaining = parseInt(remaining, 10);
    if (used !== null) requestsUsed = parseInt(used, 10);

    console.log(`Odds API usage: ${requestsUsed} used, ${requestsRemaining} remaining`);

    if (requestsRemaining !== null && requestsRemaining < 50) {
      console.warn(`⚠ Odds API: only ${requestsRemaining} requests remaining this month!`);
    }

    if (!res.ok) {
      console.error(`Odds API error: ${res.status} ${res.statusText} — ${url}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    if (err.message.startsWith('Request timed out')) {
      console.error(`Odds API timeout: ${url}`);
    } else {
      console.error(`Odds API fetch failed: ${err.message} — ${url}`);
    }
    return null;
  }
}

/**
 * List all available sports from The Odds API.
 * @returns {Promise<object[] | null>} Array of sport objects or null
 */
export async function getSports() {
  const url = `${BASE_URL}/sports/?apiKey=${API_KEY}`;
  return getOrFetch('odds:sports', () => fetchOdds(url), TTL.ODDS);
}

/**
 * Fetch odds for all upcoming events in a sport.
 *
 * @param {string} sportKey - Odds API sport key (e.g. 'basketball_nba')
 * @param {string} [markets='h2h,spreads,totals'] - Comma-separated market types
 * @returns {Promise<object[] | null>} Array of event odds or null
 *
 * @example
 *   const odds = await getOdds('basketball_nba');
 *   const spreadsOnly = await getOdds('americanfootball_nfl', 'spreads');
 */
export async function getOdds(sportKey, markets = DEFAULT_MARKETS) {
  const url = `${BASE_URL}/sports/${sportKey}/odds?apiKey=${API_KEY}&regions=${REGION}&markets=${markets}&oddsFormat=${ODDS_FORMAT}`;
  const d = new Date();
  const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return getOrFetch(keys.odds(sportKey, today), () => fetchOdds(url), TTL.ODDS);
}

/**
 * Fetch odds for a single event (used for player props and detailed markets).
 *
 * @param {string} sportKey - Odds API sport key
 * @param {string} eventId  - Odds API event ID
 * @param {string} [markets='h2h,spreads,totals'] - Comma-separated market types
 * @returns {Promise<object | null>} Event odds or null
 *
 * @example
 *   const props = await getEventOdds('basketball_nba', 'abc123', 'player_points');
 */
export async function getEventOdds(sportKey, eventId, markets = DEFAULT_MARKETS) {
  const url = `${BASE_URL}/sports/${sportKey}/events/${eventId}/odds?apiKey=${API_KEY}&regions=${REGION}&markets=${markets}&oddsFormat=${ODDS_FORMAT}`;
  return getOrFetch(keys.oddsEvent(sportKey, eventId), () => fetchOdds(url), TTL.ODDS);
}

/**
 * Get the current API usage stats tracked from response headers.
 * Returns null values if no requests have been made yet.
 *
 * @returns {{ remaining: number | null, used: number | null }}
 */
export function getRemainingRequests() {
  return { remaining: requestsRemaining, used: requestsUsed };
}
