import { getOrFetch, keys, TTL } from './cache.js';
import fetchWithTimeout, { TIMEOUTS } from '../utils/fetchWithTimeout.js';
import SPORT_MAPPINGS from '../utils/sportMappings.js';

// ── Odds-API.io configuration ───────────────────────────────────────
const BASE_URL = 'https://api.odds-api.io/v3';
const API_KEY = process.env.ODDS_API_IO_KEY;
const BOOKMAKERS = 'FanDuel,DraftKings';
const MULTI_BATCH_SIZE = 10; // /odds/multi supports up to 10 events

/** Tracks hourly request usage (estimated client-side) */
let requestCount = 0;
let windowStart = Date.now();
let rateLimitResetAt = 0; // timestamp when 429 rate limit resets
const HOURLY_LIMIT = 100;

function trackRequest() {
  const now = Date.now();
  // If we previously hit a 429, check if the reset time has passed
  if (rateLimitResetAt && now >= rateLimitResetAt) {
    requestCount = 0;
    windowStart = now;
    rateLimitResetAt = 0;
  }
  // Normal hourly window reset
  if (now - windowStart > 3_600_000) {
    requestCount = 0;
    windowStart = now;
  }
  requestCount++;
}

// ── Decimal → American odds conversion ──────────────────────────────

/**
 * Convert European decimal odds to American format.
 * @param {string|number} decimal
 * @returns {number} American odds (e.g. -162 or +136)
 */
function decimalToAmerican(decimal) {
  const d = parseFloat(decimal);
  if (isNaN(d) || d <= 1) return 100;
  if (d >= 2.0) return Math.round((d - 1) * 100);
  return Math.round(-100 / (d - 1));
}

// ── HTTP helper ─────────────────────────────────────────────────────

/**
 * Fetch JSON from Odds-API.io. Returns null on failure.
 * @param {string} url
 * @returns {Promise<any|null>}
 */
async function fetchOddsApiIo(url) {
  if (!API_KEY) {
    console.error('Odds-API.io: ODDS_API_IO_KEY is not set');
    return null;
  }

  try {
    trackRequest();
    const res = await fetchWithTimeout(url, {}, TIMEOUTS.ODDS);

    if (res.status === 429) {
      // Rate limited — mark counter as exhausted
      requestCount = HOURLY_LIMIT;
      const body = await res.text().catch(() => '');
      // Parse reset time from error message (e.g. "resets in 51 minutes and 6 seconds")
      const match = body.match(/resets in (\d+) minutes?(?: and (\d+) seconds?)?/);
      if (match) {
        const mins = parseInt(match[1], 10) || 0;
        const secs = parseInt(match[2], 10) || 0;
        rateLimitResetAt = Date.now() + (mins * 60 + secs) * 1000;
      } else {
        // Fallback: assume reset in 60 minutes
        rateLimitResetAt = Date.now() + 3_600_000;
      }
      console.warn(`Odds-API.io rate limited (100/hr), resets at ${new Date(rateLimitResetAt).toISOString()}: ${body}`);
      return null;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Odds-API.io error: ${res.status} ${res.statusText} — ${body}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    if (err.message.startsWith('Request timed out')) {
      console.error(`Odds-API.io timeout: ${url}`);
    } else {
      console.error(`Odds-API.io fetch failed: ${err.message}`);
    }
    return null;
  }
}

// ── Odds-API.io endpoints ───────────────────────────────────────────

/**
 * Fetch upcoming events for a sport + league.
 * @param {string} sportSlug  e.g. 'basketball'
 * @param {string} leagueSlug e.g. 'usa-nba'
 * @returns {Promise<object[]|null>}
 */
async function fetchEvents(sportSlug, leagueSlug) {
  const url = `${BASE_URL}/events?sport=${sportSlug}&league=${leagueSlug}&apiKey=${API_KEY}`;
  return fetchOddsApiIo(url);
}

/**
 * Fetch odds for multiple events (up to 10 per call).
 * @param {number[]} eventIds
 * @returns {Promise<object[]|null>}
 */
async function fetchOddsMulti(eventIds) {
  if (!eventIds.length) return [];
  const url = `${BASE_URL}/odds/multi?eventIds=${eventIds.join(',')}&bookmakers=${BOOKMAKERS}&apiKey=${API_KEY}`;
  return fetchOddsApiIo(url);
}

// ── Response transformation ─────────────────────────────────────────

/**
 * Pick the "main" line from an array of alternate lines.
 * The main line is the one where odds are closest to even (1.91 decimal = -110 American).
 * @param {object[]} lines - Array of line objects with odds values
 * @param {string} keyA - First odds key ('home'/'over')
 * @param {string} keyB - Second odds key ('away'/'under')
 * @returns {object|null}
 */
function pickMainLine(lines, keyA, keyB) {
  if (!lines?.length) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const line of lines) {
    const a = parseFloat(line[keyA]);
    const b = parseFloat(line[keyB]);
    if (isNaN(a) || isNaN(b)) continue;
    // Both sides closest to 1.91 (American -110)
    const diff = Math.abs(a - 1.91) + Math.abs(b - 1.91);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = line;
    }
  }
  return best;
}

/**
 * Transform a single Odds-API.io event+odds response into the format
 * that the aggregator expects (matching The Odds API v4 structure).
 *
 * Expected output: {
 *   id, home_team, away_team, commence_time,
 *   bookmakers: [{ key, title, markets: [{ key, outcomes: [{ name, price, point }] }] }]
 * }
 */
function transformEvent(event, oddsData) {
  const homeName = event.home || oddsData?.home || '';
  const awayName = event.away || oddsData?.away || '';
  const bookmakers = [];

  const bmData = oddsData?.bookmakers || {};
  for (const [bmName, markets] of Object.entries(bmData)) {
    const transformedMarkets = [];

    for (const market of markets) {
      const mName = market.name;

      if (mName === 'ML') {
        // Moneyline → h2h
        const line = market.odds?.[0];
        if (line) {
          transformedMarkets.push({
            key: 'h2h',
            outcomes: [
              { name: homeName, price: decimalToAmerican(line.home), point: null },
              { name: awayName, price: decimalToAmerican(line.away), point: null },
            ],
          });
        }
      } else if (mName === 'Spread') {
        // Spread → spreads (pick main line)
        const main = pickMainLine(market.odds, 'home', 'away');
        if (main) {
          const hdp = main.hdp;
          transformedMarkets.push({
            key: 'spreads',
            outcomes: [
              { name: homeName, price: decimalToAmerican(main.home), point: hdp },
              { name: awayName, price: decimalToAmerican(main.away), point: -hdp },
            ],
          });
        }
      } else if (mName === 'Totals') {
        // Totals → totals (pick main line)
        const main = pickMainLine(market.odds, 'over', 'under');
        if (main) {
          transformedMarkets.push({
            key: 'totals',
            outcomes: [
              { name: 'Over', price: decimalToAmerican(main.over), point: main.hdp },
              { name: 'Under', price: decimalToAmerican(main.under), point: main.hdp },
            ],
          });
        }
      }
    }

    if (transformedMarkets.length) {
      bookmakers.push({
        key: bmName.toLowerCase().replace(/\s+/g, '_'),
        title: bmName,
        markets: transformedMarkets,
      });
    }
  }

  return {
    id: String(event.id),
    home_team: homeName,
    away_team: awayName,
    commence_time: event.date,
    bookmakers,
  };
}

// ── Public API (same interface as before) ───────────────────────────

/**
 * List all available sports from Odds-API.io.
 * @returns {Promise<object[]|null>}
 */
export async function getSports() {
  const url = `${BASE_URL}/sports`;
  return getOrFetch('odds:sports', () => fetchOddsApiIo(url), TTL.ODDS);
}

/**
 * Fetch odds for all upcoming events in a sport.
 * Maps the app sport key (e.g. 'basketball_nba') to Odds-API.io slugs,
 * fetches events + odds, and returns data in the legacy format.
 *
 * @param {string} sportKey - Odds API sport key (e.g. 'basketball_nba') or app key (e.g. 'nba')
 * @returns {Promise<object[]|null>}
 */
export async function getOdds(sportKey) {
  // Resolve the Odds-API.io mapping
  const mapping = resolveMapping(sportKey);
  if (!mapping) {
    console.warn(`Odds-API.io: no mapping for sport key "${sportKey}"`);
    return null;
  }

  const { sport: sportSlug, league: leagueSlug } = mapping;
  const d = new Date();
  const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  return getOrFetch(keys.odds(sportKey, today), async () => {
    // 1. Fetch events for this sport/league
    const allEvents = await fetchEvents(sportSlug, leagueSlug);
    if (!allEvents?.length) return [];

    // 2. Filter to today's events (±1 day for timezone safety)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowEnd = new Date(todayStart.getTime() + 2 * 86_400_000);
    const events = allEvents.filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate >= todayStart && eventDate < tomorrowEnd;
    });

    if (!events.length) {
      // Return all events without odds so team-name matching still works
      return allEvents.map((event) => transformEvent(event, null));
    }

    // 3. Fetch odds only for today's events, in batches of 10
    const eventIds = events.map((e) => e.id);
    const oddsMap = new Map();

    for (let i = 0; i < eventIds.length; i += MULTI_BATCH_SIZE) {
      const batch = eventIds.slice(i, i + MULTI_BATCH_SIZE);
      const oddsResults = await fetchOddsMulti(batch);
      if (oddsResults) {
        for (const od of oddsResults) {
          oddsMap.set(od.id, od);
        }
      }
    }

    // 4. Merge and transform to legacy format
    return events.map((event) => {
      const oddsData = oddsMap.get(event.id) || null;
      return transformEvent(event, oddsData);
    });
  }, TTL.ODDS);
}

/**
 * Fetch odds for a single event.
 *
 * @param {string} sportKey - Sport key
 * @param {string} eventId  - Odds-API.io event ID
 * @returns {Promise<object|null>}
 */
export async function getEventOdds(sportKey, eventId) {
  const url = `${BASE_URL}/odds?eventId=${eventId}&bookmakers=${BOOKMAKERS}&apiKey=${API_KEY}`;
  return getOrFetch(keys.oddsEvent(sportKey, eventId), async () => {
    const data = await fetchOddsApiIo(url);
    if (!data) return null;
    return transformEvent(data, data);
  }, TTL.ODDS);
}

/**
 * Get estimated API usage stats.
 * Odds-API.io free tier: 100 requests/hour, resets hourly.
 *
 * @returns {{ remaining: number|null, used: number|null }}
 */
export function getRemainingRequests() {
  const now = Date.now();
  // If we hit a 429 and the reset time has passed, clear the counter
  if (rateLimitResetAt && now >= rateLimitResetAt) {
    requestCount = 0;
    windowStart = now;
    rateLimitResetAt = 0;
  }
  // Normal hourly window reset
  if (now - windowStart > 3_600_000) {
    requestCount = 0;
    windowStart = now;
  }
  return {
    remaining: Math.max(0, HOURLY_LIMIT - requestCount),
    used: requestCount,
  };
}

// ── Internal helpers ────────────────────────────────────────────────

/**
 * Resolve the Odds-API.io sport/league mapping from either:
 * - an app sport key ('nba', 'nfl', etc.)
 * - an old Odds API compound key ('basketball_nba', 'americanfootball_nfl', etc.)
 *
 * @param {string} key
 * @returns {{ sport: string, league: string }|null}
 */
function resolveMapping(key) {
  // Direct app key match
  if (SPORT_MAPPINGS[key]?.oddsApiIo) {
    return SPORT_MAPPINGS[key].oddsApiIo;
  }

  // Reverse lookup by old oddsApi key
  for (const mapping of Object.values(SPORT_MAPPINGS)) {
    if (mapping.oddsApi === key && mapping.oddsApiIo) {
      return mapping.oddsApiIo;
    }
  }

  return null;
}
