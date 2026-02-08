import NodeCache from 'node-cache';

/** Default TTLs in seconds, per CLAUDE.md caching strategy */
export const TTL = {
  ESPN: 1800,        // 30 min — scores, scoreboard, standings
  ESPN_STATS: 3600,  // 60 min — team stats
  ODDS: 900,         // 15 min — odds data
  ANALYSIS: 3600,    // 60 min — Claude analysis
  BDL: 3600,         // 60 min — BallDontLie stats
};

const cache = new NodeCache({ stdTTL: TTL.ESPN, checkperiod: 120 });

/** Stale store — keeps values even after TTL expiry for fallback */
const staleStore = new Map();

let hits = 0;
let misses = 0;

/**
 * Get a value from cache.
 * @param {string} key
 * @returns {any | undefined}
 */
export function get(key) {
  const value = cache.get(key);
  if (value !== undefined) {
    hits++;
    return value;
  }
  misses++;
  return undefined;
}

/**
 * Get a stale (expired) value that was previously cached.
 * Used as a fallback when a fresh fetch fails.
 * @param {string} key
 * @returns {any | undefined}
 */
export function getStale(key) {
  return staleStore.get(key);
}

/**
 * Set a value in cache.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds] - TTL override; uses default if omitted
 */
export function set(key, value, ttlSeconds) {
  staleStore.set(key, value);
  if (ttlSeconds !== undefined) {
    cache.set(key, value, ttlSeconds);
  } else {
    cache.set(key, value);
  }
}

/**
 * Check cache first; on miss, call fetchFn, cache the result, and return it.
 * On fetchFn failure, falls back to stale cache before returning null.
 *
 * @param {string} key
 * @param {() => Promise<any>} fetchFn - Called on cache miss
 * @param {number} [ttlSeconds] - TTL override
 * @returns {Promise<any>}
 */
export async function getOrFetch(key, fetchFn, ttlSeconds) {
  const cached = get(key);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const data = await fetchFn();
    if (data != null) {
      set(key, data, ttlSeconds);
      return data;
    }
  } catch (err) {
    console.warn(`Cache getOrFetch failed for ${key}: ${err.message}`);
  }

  // Attempt stale fallback
  const stale = staleStore.get(key);
  if (stale !== undefined) {
    console.log(`Using stale cache for ${key}`);
    return stale;
  }

  return undefined;
}

/**
 * Cache hit/miss stats for monitoring.
 * @returns {{ hits: number, misses: number, keys: number, hitRate: string }}
 */
export function stats() {
  const total = hits + misses;
  return {
    hits,
    misses,
    keys: cache.keys().length,
    hitRate: total === 0 ? '0%' : `${((hits / total) * 100).toFixed(1)}%`,
  };
}

/**
 * Flush the entire cache. Useful for testing / manual refresh.
 */
export function flush() {
  cache.flushAll();
  staleStore.clear();
  hits = 0;
  misses = 0;
}

// ── Cache key helpers (patterns from CLAUDE.md) ─────────────────────

/** @param {string} sport @param {string} date YYYYMMDD */
export const keys = {
  espnScores: (sport, date) => `espn:${sport}:scores:${date}`,
  espnTeamStats: (sport, teamId) => `espn:${sport}:team:${teamId}:stats`,
  espnGameSummary: (sport, gameId) => `espn:${sport}:game:${gameId}:summary`,
  espnStandings: (sport) => `espn:${sport}:standings`,
  espnInjuries: (sport) => `espn:${sport}:injuries`,
  odds: (sport, date) => `odds:${sport}:${date}`,
  oddsEvent: (sport, eventId) => `odds:${sport}:event:${eventId}`,
  analysis: (sport, date, gameId) => `analysis:${sport}:${date}:${gameId}`,
  bdlPlayerStats: (sport, playerId) => `bdl:${sport}:player:${playerId}:stats`,
};
