import { getOrFetch, keys, TTL } from './cache.js';
import fetchWithTimeout, { TIMEOUTS } from '../utils/fetchWithTimeout.js';

const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';
const SUMMARY_BASE_URL = 'https://site.web.api.espn.com/apis/site/v2/sports';

/**
 * Internal helper — fetches JSON from a URL, returns null on failure.
 * @param {string} url
 * @returns {Promise<object | null>}
 */
async function fetchJson(url) {
  try {
    const res = await fetchWithTimeout(url, {}, TIMEOUTS.ESPN);
    if (!res.ok) {
      console.error(`ESPN API error: ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    if (err.message.startsWith('Request timed out')) {
      console.error(`ESPN timeout: ${url}`);
    } else {
      console.error(`ESPN fetch failed: ${err.message} — ${url}`);
    }
    return null;
  }
}

/**
 * Fetch the scoreboard (list of games) for a given sport, league, and date.
 *
 * @param {string} sport  - ESPN sport segment (e.g. 'football', 'basketball')
 * @param {string} league - ESPN league segment (e.g. 'nfl', 'nba')
 * @param {string} date   - Date in YYYYMMDD format
 * @returns {Promise<object | null>} Scoreboard data or null on failure
 *
 * @example
 *   const games = await getScoreboard('basketball', 'nba', '20260207');
 */
export async function getScoreboard(sport, league, date) {
  const url = `${BASE_URL}/${sport}/${league}/scoreboard?dates=${date}`;
  return getOrFetch(keys.espnScores(league, date), () => fetchJson(url), TTL.ESPN);
}

/**
 * Fetch statistics for a specific team.
 *
 * @param {string} sport  - ESPN sport segment
 * @param {string} league - ESPN league segment
 * @param {string} teamId - ESPN team ID
 * @returns {Promise<object | null>} Team statistics or null on failure
 *
 * @example
 *   const stats = await getTeamStats('basketball', 'nba', '13');
 */
export async function getTeamStats(sport, league, teamId) {
  const url = `${BASE_URL}/${sport}/${league}/teams/${teamId}/statistics`;
  return getOrFetch(keys.espnTeamStats(league, teamId), () => fetchJson(url), TTL.ESPN_STATS);
}

/**
 * Fetch a detailed game summary (boxscore, leaders, plays, etc.).
 * Uses the separate site.web.api.espn.com host required for summaries.
 *
 * @param {string} sport   - ESPN sport segment
 * @param {string} league  - ESPN league segment
 * @param {string} eventId - ESPN event ID
 * @returns {Promise<object | null>} Game summary or null on failure
 *
 * @example
 *   const summary = await getGameSummary('football', 'nfl', '401547417');
 */
export async function getGameSummary(sport, league, eventId) {
  const url = `${SUMMARY_BASE_URL}/${sport}/${league}/summary?event=${eventId}`;
  return getOrFetch(keys.espnGameSummary(league, eventId), () => fetchJson(url), TTL.ESPN);
}

/**
 * Fetch current standings for a league.
 *
 * @param {string} sport  - ESPN sport segment
 * @param {string} league - ESPN league segment
 * @returns {Promise<object | null>} Standings data or null on failure
 *
 * @example
 *   const standings = await getStandings('hockey', 'nhl');
 */
export async function getStandings(sport, league) {
  const url = `${BASE_URL}/${sport}/${league}/standings`;
  return getOrFetch(keys.espnStandings(league), () => fetchJson(url), TTL.ESPN);
}

/**
 * Fetch injury information for a league.
 * ESPN exposes injuries on the league-level injuries endpoint.
 *
 * @param {string} sport  - ESPN sport segment
 * @param {string} league - ESPN league segment
 * @returns {Promise<object | null>} Injury data or null on failure
 *
 * @example
 *   const injuries = await getInjuries('football', 'nfl');
 */
export async function getInjuries(sport, league) {
  const url = `${BASE_URL}/${sport}/${league}/injuries`;
  return getOrFetch(keys.espnInjuries(league), () => fetchJson(url), TTL.ESPN);
}
