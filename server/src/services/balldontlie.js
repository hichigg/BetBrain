import { getOrFetch, TTL } from './cache.js';
import fetchWithTimeout, { TIMEOUTS } from '../utils/fetchWithTimeout.js';

const BASE = 'https://api.balldontlie.io';
const API_KEY = process.env.BALLDONTLIE_API_KEY;

// Sport → BDL API prefix mapping
const SPORT_PREFIX = {
  nba: '/v1',
  nfl: '/nfl/v1',
  mlb: '/mlb/v1',
  nhl: '/nhl/v1',
};

// Sport-specific stat keys for prompt formatting
const PLAYER_STAT_KEYS = {
  nba: { primary: 'pts', secondary: ['reb', 'ast', 'stl', 'blk', 'fg_pct', 'fg3_pct', 'ft_pct', 'turnover', 'min'] },
  nfl: { primary: 'pass_yds', secondary: ['pass_td', 'rush_yds', 'rush_td', 'rec_yds', 'rec_td', 'sacks', 'interceptions'] },
  mlb: { primary: 'hits', secondary: ['home_runs', 'rbi', 'batting_avg', 'obp', 'slg', 'stolen_bases', 'strikeouts', 'era', 'whip'] },
  nhl: { primary: 'goals', secondary: ['assists', 'points', 'plus_minus', 'shots', 'hits', 'blocked_shots', 'save_pct'] },
};

// ── Internal fetch helper ────────────────────────────────────────────

async function fetchBDL(path) {
  if (!API_KEY) {
    return null;
  }

  try {
    const res = await fetchWithTimeout(
      `${BASE}${path}`,
      { headers: { Authorization: API_KEY } },
      TIMEOUTS.BDL,
    );

    if (!res.ok) {
      if (res.status === 429) {
        console.warn('BallDontLie: rate limited');
      } else if (res.status !== 401) {
        // 401 = paid tier endpoint, don't spam logs
        console.error(`BallDontLie ${res.status}: ${path}`);
      }
      return null;
    }

    return await res.json();
  } catch (err) {
    if (err.message.startsWith('Request timed out')) {
      console.error(`BallDontLie timeout: ${path}`);
    } else {
      console.error(`BallDontLie fetch failed: ${err.message}`);
    }
    return null;
  }
}

// ── Free-tier compatible functions ───────────────────────────────────

/**
 * Get all teams for a sport.
 */
export async function getTeams(sport) {
  const prefix = SPORT_PREFIX[sport];
  if (!prefix) return null;

  return getOrFetch(`bdl:${sport}:teams`, () => fetchBDL(`${prefix}/teams`), TTL.BDL);
}

/**
 * Search players by name.
 */
export async function searchPlayers(sport, name) {
  const prefix = SPORT_PREFIX[sport];
  if (!prefix) return null;

  return fetchBDL(`${prefix}/players?search=${encodeURIComponent(name)}&per_page=10`);
}

/**
 * Get players on a team.
 */
export async function getTeamPlayers(sport, teamId) {
  const prefix = SPORT_PREFIX[sport];
  if (!prefix) return null;

  const path = `${prefix}/players?team_ids[]=${teamId}&per_page=25`;
  const key = `bdl:${sport}:team:${teamId}:players`;

  return getOrFetch(key, () => fetchBDL(path), TTL.BDL);
}

/**
 * Get recent games for a team (free tier compatible).
 * Returns player box scores from recent games.
 */
export async function getTeamRecentGames(sport, teamId, count = 5) {
  const prefix = SPORT_PREFIX[sport];
  if (!prefix) return null;

  const currentSeason = new Date().getFullYear();
  const path = `${prefix}/games?team_ids[]=${teamId}&seasons[]=${currentSeason}&per_page=${count}`;
  const key = `bdl:${sport}:team:${teamId}:recent:${count}`;

  return getOrFetch(key, () => fetchBDL(path), TTL.BDL);
}

// ── Paid-tier functions (gracefully fail on free tier) ────────────────

/**
 * Get season averages for a player (requires paid tier).
 */
export async function getPlayerStats(sport, playerId, season) {
  const prefix = SPORT_PREFIX[sport];
  if (!prefix) return null;

  const seasonParam = season ? `&season=${season}` : '';
  const path = `${prefix}/season_averages/general?player_id=${playerId}${seasonParam}`;
  const key = `bdl:${sport}:player:${playerId}:season${season || ''}`;

  return getOrFetch(key, () => fetchBDL(path), TTL.BDL);
}

/**
 * Get player game log (requires paid tier).
 */
export async function getPlayerGameLog(sport, playerId, last = 5) {
  const prefix = SPORT_PREFIX[sport];
  if (!prefix) return null;

  const currentSeason = new Date().getFullYear();
  const path = `${prefix}/stats?player_ids[]=${playerId}&seasons[]=${currentSeason}&per_page=${last}`;
  const key = `bdl:${sport}:player:${playerId}:gamelog:${last}`;

  return getOrFetch(key, () => fetchBDL(path), TTL.BDL);
}

/**
 * Get league leaders (requires paid tier).
 */
export async function getLeagueLeaders(sport, stat, season) {
  const prefix = SPORT_PREFIX[sport];
  if (!prefix) return null;

  const seasonParam = season ? `&season=${season}` : '';
  const path = `${prefix}/leaders?stat_type=${stat}${seasonParam}`;
  const key = `bdl:${sport}:leaders:${stat}:${season || 'current'}`;

  return getOrFetch(key, () => fetchBDL(path), TTL.BDL);
}

// ── Top players extraction ───────────────────────────────────────────

/**
 * Get top players for a team. Tries paid-tier season_averages first,
 * falls back to building a roster from free-tier player search.
 *
 * @param {string} sport
 * @param {number} teamId - BDL team ID
 * @param {number} [limit=5]
 */
export async function getTopPlayersForTeam(sport, teamId, limit = 5) {
  // Get team roster
  const roster = await getTeamPlayers(sport, teamId);
  if (!roster?.data?.length) return [];

  const players = roster.data.slice(0, 15);
  const playerIds = players.map((p) => p.id);

  // Try paid-tier season averages
  const statsResults = await Promise.all(
    playerIds.map((id) => getPlayerStats(sport, id)),
  );

  const statsAvailable = statsResults.filter((r) => r?.data?.length > 0);

  if (statsAvailable.length > 0) {
    // Paid tier: use season averages
    const statKeys = PLAYER_STAT_KEYS[sport] || PLAYER_STAT_KEYS.nba;
    const enriched = statsAvailable.map((r) => {
      const s = r.data[0];
      const player = players.find((p) => p.id === s.player_id) || {};
      const statLine = {};
      statLine[statKeys.primary] = s[statKeys.primary];
      for (const key of statKeys.secondary) {
        if (s[key] != null) statLine[key] = s[key];
      }
      return {
        id: s.player_id,
        name: player.first_name && player.last_name
          ? `${player.first_name} ${player.last_name}`
          : `Player #${s.player_id}`,
        position: player.position || null,
        stats: statLine,
      };
    });

    enriched.sort((a, b) => (b.stats[statKeys.primary] || 0) - (a.stats[statKeys.primary] || 0));
    return enriched.slice(0, limit);
  }

  // Free tier fallback: return roster with basic info (position, height, weight)
  return players.slice(0, limit).map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    position: p.position || null,
    stats: {},
  }));
}

export { PLAYER_STAT_KEYS };
