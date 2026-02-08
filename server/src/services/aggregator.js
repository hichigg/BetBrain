import SPORT_MAPPINGS from '../utils/sportMappings.js';
import * as espn from './espn.js';
import { getOdds } from './odds.js';
import { getTopPlayersForTeam, searchPlayers } from './balldontlie.js';
import { getOrFetch, getStale, TTL, keys } from './cache.js';

// ── Team-name normalization for ESPN ↔ Odds API matching ────────────

/**
 * Normalize a team name to a comparable lowercase token.
 * Strips common suffixes, city aliases, punctuation.
 */
export function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(
      /\b(state|st|university|univ|college)\b/g,
      (m) => (m === 'st' ? 'state' : m),
    )
    .trim();
}

/**
 * Score how well two team name strings match.
 * Returns a value 0–1 where 1 is a perfect match.
 */
export function nameScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  // Check if last word (typically mascot/nickname) matches
  const lastA = na.split(' ').pop();
  const lastB = nb.split(' ').pop();
  if (lastA.length > 2 && lastA === lastB) return 0.6;

  return 0;
}

// ── Extraction helpers ──────────────────────────────────────────────

/**
 * Extract a clean team object from an ESPN competitor entry.
 */
function extractTeam(competitor) {
  const team = competitor.team || {};
  const records = competitor.records || [];
  const overallRecord = records.find((r) => r.type === 'total');
  const homeRecord = records.find((r) => r.type === 'home');
  const awayRecord = records.find((r) => r.type === 'road');

  return {
    id: team.id,
    name: team.displayName || team.name,
    shortName: team.shortDisplayName,
    abbreviation: team.abbreviation,
    logo: team.logo,
    homeAway: competitor.homeAway,
    score: competitor.score || null,
    winner: competitor.winner ?? null,
    record: overallRecord?.summary || null,
    homeRecord: homeRecord?.summary || null,
    awayRecord: awayRecord?.summary || null,
  };
}

/**
 * Extract inline stats from an ESPN competitor (scoreboard-level).
 * These are per-game stats attached directly to the competitor entry.
 */
function extractInlineStats(competitor) {
  const stats = competitor.statistics || [];
  const map = {};
  for (const s of stats) {
    map[s.name] = s.displayValue;
  }
  return map;
}

/**
 * Build a structured odds object from Odds API bookmaker data.
 */
function extractOdds(oddsEvent) {
  if (!oddsEvent?.bookmakers?.length) return null;

  const bookmakers = oddsEvent.bookmakers.map((bm) => {
    const markets = {};
    for (const market of bm.markets || []) {
      markets[market.key] = market.outcomes.map((o) => ({
        name: o.name,
        price: o.price,
        point: o.point ?? null,
      }));
    }
    return { key: bm.key, title: bm.title, markets };
  });

  // Build a consensus view from the first bookmaker
  const primary = bookmakers[0];
  const consensus = {};

  if (primary.markets.h2h) {
    consensus.moneyline = primary.markets.h2h.map((o) => ({
      team: o.name,
      price: o.price,
    }));
  }
  if (primary.markets.spreads) {
    consensus.spread = primary.markets.spreads.map((o) => ({
      team: o.name,
      point: o.point,
      price: o.price,
    }));
  }
  if (primary.markets.totals) {
    consensus.total = primary.markets.totals.map((o) => ({
      label: o.name,
      point: o.point,
      price: o.price,
    }));
  }

  return { consensus, bookmakers };
}

/**
 * Extract injury info for specific teams from the league injury data.
 */
function extractInjuriesForTeams(injuryData, teamIds) {
  if (!injuryData?.length) return {};

  const result = {};
  for (const teamEntry of injuryData) {
    const teamId = teamEntry.team?.id;
    if (!teamIds.includes(teamId)) continue;

    result[teamId] = (teamEntry.injuries || []).map((inj) => ({
      name: inj.athlete?.displayName,
      position: inj.athlete?.position?.abbreviation,
      status: inj.status,
      description: inj.type?.description || inj.details?.detail,
    }));
  }
  return result;
}

// ── BDL team ID resolution ───────────────────────────────────────────

/**
 * Resolve a BDL team ID from an ESPN team name by searching for a player on that team.
 * Caches results for 60 min.
 */
async function resolveBdlTeamId(sport, teamName) {
  if (!teamName) return null;

  const cacheKey = `bdl:${sport}:teamId:${normalize(teamName)}`;
  return getOrFetch(cacheKey, async () => {
    // Search BDL for a player on this team — the player result includes team_id
    const result = await searchPlayers(sport, teamName.split(' ').pop());
    if (!result?.data?.length) return null;

    // Find a player whose team name matches
    for (const player of result.data) {
      const bdlTeam = player.team?.full_name || player.team?.name || '';
      if (nameScore(teamName, bdlTeam) >= 0.6) {
        return player.team.id;
      }
    }
    return null;
  }, TTL.BDL);
}

/**
 * Fetch top players for both teams. Returns { homePlayers, awayPlayers }.
 * Fails gracefully — returns empty arrays on error.
 */
async function fetchPlayerData(sport, homeName, awayName) {
  try {
    const [homeTeamId, awayTeamId] = await Promise.all([
      resolveBdlTeamId(sport, homeName),
      resolveBdlTeamId(sport, awayName),
    ]);

    const [homePlayers, awayPlayers] = await Promise.all([
      homeTeamId ? getTopPlayersForTeam(sport, homeTeamId, 5) : [],
      awayTeamId ? getTopPlayersForTeam(sport, awayTeamId, 5) : [],
    ]);

    return { homePlayers: homePlayers || [], awayPlayers: awayPlayers || [] };
  } catch (err) {
    console.warn('BDL player data fetch failed:', err.message);
    return { homePlayers: [], awayPlayers: [] };
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Match Odds API events to ESPN games by comparing team names.
 * Returns a Map of ESPN event ID → Odds API event.
 *
 * @param {object[]} espnEvents - ESPN scoreboard events
 * @param {object[]} oddsData   - Odds API events array
 * @returns {Map<string, object>} ESPN event ID → matched odds event
 */
export function matchOddsToGames(espnEvents, oddsData) {
  const matched = new Map();
  if (!espnEvents?.length || !oddsData?.length) return matched;

  // Build lookup from odds events
  const remaining = [...oddsData];

  for (const espnEvent of espnEvents) {
    const comp = espnEvent.competitions?.[0];
    if (!comp) continue;

    const home = comp.competitors?.find((c) => c.homeAway === 'home');
    const away = comp.competitors?.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    const espnHome = home.team?.displayName || '';
    const espnAway = away.team?.displayName || '';

    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < remaining.length; i++) {
      const oddsEv = remaining[i];
      const homeScore = nameScore(espnHome, oddsEv.home_team || '');
      const awayScore = nameScore(espnAway, oddsEv.away_team || '');
      const combined = homeScore + awayScore;

      if (combined > bestScore) {
        bestScore = combined;
        bestIdx = i;
      }
    }

    // Require at least one strong match to accept
    if (bestScore >= 1.0 && bestIdx !== -1) {
      matched.set(espnEvent.id, remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }
  }

  return matched;
}

/**
 * Fetch and aggregate games for a sport on a given date.
 * Combines ESPN scoreboard + injuries with Odds API data.
 *
 * @param {string} sport - App sport key (e.g. 'nba', 'nfl')
 * @param {string} date  - Date as YYYY-MM-DD
 * @returns {Promise<object[]>} Array of unified game objects
 */
export async function getGamesForSport(sport, date) {
  const mapping = SPORT_MAPPINGS[sport];
  if (!mapping) return [];

  const { espn: espnMap, oddsApi } = mapping;
  const espnDate = date.replace(/-/g, '');

  // Fetch ESPN scoreboard, odds, and injuries in parallel — use allSettled so one failure doesn't kill the request
  const results = await Promise.allSettled([
    espn.getScoreboard(espnMap.sport, espnMap.league, espnDate),
    getOdds(oddsApi),
    espn.getInjuries(espnMap.sport, espnMap.league),
  ]);

  let scoreboard = results[0].status === 'fulfilled' ? results[0].value : null;
  const oddsData = results[1].status === 'fulfilled' ? results[1].value : null;
  const injuryData = results[2].status === 'fulfilled' ? results[2].value : null;

  // If ESPN scoreboard failed, try stale cache
  if (!scoreboard) {
    scoreboard = getStale(keys.espnScores(espnMap.league, espnDate)) || null;
    if (scoreboard) console.log(`Using stale ESPN scoreboard for ${sport}/${espnDate}`);
  }

  const events = scoreboard?.events || [];
  if (!events.length) return [];

  // Match odds to ESPN games
  const oddsMap = matchOddsToGames(events, oddsData || []);

  return events.map((event) => {
    const comp = event.competitions[0];
    const homeComp = comp.competitors.find((c) => c.homeAway === 'home');
    const awayComp = comp.competitors.find((c) => c.homeAway === 'away');

    const home = extractTeam(homeComp);
    const away = extractTeam(awayComp);

    // Inline stats from scoreboard (ppg, rebounds, etc. when available)
    const homeStats = extractInlineStats(homeComp);
    const awayStats = extractInlineStats(awayComp);

    // Injuries for these two teams
    const teamIds = [home.id, away.id].filter(Boolean);
    const injuries = extractInjuriesForTeams(injuryData, teamIds);

    // Odds from The Odds API
    const oddsEvent = oddsMap.get(event.id);
    const odds = extractOdds(oddsEvent);

    return {
      id: event.id,
      sport,
      date: event.date,
      name: event.name,
      shortName: event.shortName,
      status: {
        state: comp.status?.type?.name,
        detail: comp.status?.type?.description || comp.status?.type?.shortDetail,
        clock: comp.status?.displayClock,
        period: comp.status?.period,
      },
      venue: comp.venue
        ? {
            name: comp.venue.fullName,
            city: comp.venue.address?.city,
            state: comp.venue.address?.state,
          }
        : null,
      home: { ...home, stats: homeStats },
      away: { ...away, stats: awayStats },
      odds,
      injuries: {
        home: injuries[home.id] || [],
        away: injuries[away.id] || [],
      },
    };
  });
}

/**
 * Fetch a single game with deep detail — team season stats, game summary,
 * and enriched odds.
 *
 * @param {string} sport  - App sport key (e.g. 'nba', 'nfl')
 * @param {string} gameId - ESPN event ID
 * @returns {Promise<object | null>} Enriched game object or null
 */
export async function getGameDetail(sport, gameId) {
  const mapping = SPORT_MAPPINGS[sport];
  if (!mapping) return null;

  const { espn: espnMap } = mapping;

  // Fetch game summary + injuries in parallel — use allSettled so injuries failure doesn't block
  const detailResults = await Promise.allSettled([
    espn.getGameSummary(espnMap.sport, espnMap.league, gameId),
    espn.getInjuries(espnMap.sport, espnMap.league),
  ]);

  const summary = detailResults[0].status === 'fulfilled' ? detailResults[0].value : null;
  const injuryData = detailResults[1].status === 'fulfilled' ? detailResults[1].value : null;

  if (!summary) return null;

  const comp = summary.header?.competitions?.[0];
  if (!comp) return null;

  const homeComp = comp.competitors?.find((c) => c.homeAway === 'home');
  const awayComp = comp.competitors?.find((c) => c.homeAway === 'away');
  if (!homeComp || !awayComp) return null;

  const homeId = homeComp.id;
  const awayId = awayComp.id;

  // Fetch team season stats in parallel
  const [homeSeasonStats, awaySeasonStats] = await Promise.all([
    espn.getTeamStats(espnMap.sport, espnMap.league, homeId),
    espn.getTeamStats(espnMap.sport, espnMap.league, awayId),
  ]);

  // Parse season stats into a flat map
  function parseSeasonStats(statsData) {
    const categories = statsData?.results?.stats?.categories || statsData?.statistics?.splits?.categories || [];
    const flat = {};
    for (const cat of categories) {
      for (const stat of cat.stats || []) {
        flat[stat.name] = {
          value: stat.value,
          displayValue: stat.displayValue,
          rank: stat.rank ?? null,
        };
      }
    }
    return flat;
  }

  // Extract basic team info from summary header
  function headerTeam(comp) {
    return {
      id: comp.id,
      name: comp.team?.displayName || comp.team?.name,
      shortName: comp.team?.shortDisplayName,
      abbreviation: comp.team?.abbreviation,
      logo: comp.team?.logos?.[0]?.href,
      record: comp.record?.[0]?.displayValue || null,
    };
  }

  const home = headerTeam(homeComp);
  const away = headerTeam(awayComp);

  // Injuries
  const teamIds = [homeId, awayId];
  const injuries = extractInjuriesForTeams(injuryData, teamIds);

  // Key players / leaders from summary
  const leaders = (summary.leaders || []).map((cat) => ({
    category: cat.displayName,
    leaders: (cat.leaders || []).map((l) => ({
      name: l.athlete?.displayName,
      team: l.athlete?.team?.abbreviation,
      value: l.displayValue,
    })),
  }));

  // Boxscore if available
  const boxscore = summary.boxscore || null;

  // Player-level data from BallDontLie (non-blocking)
  const { homePlayers, awayPlayers } = await fetchPlayerData(
    sport,
    home.name,
    away.name,
  );

  return {
    id: gameId,
    sport,
    date: comp.date,
    name: summary.header?.gameNote || `${away.name} at ${home.name}`,
    status: {
      state: comp.status?.type?.name,
      detail: comp.status?.type?.description,
    },
    venue: summary.gameInfo?.venue
      ? {
          name: summary.gameInfo.venue.fullName,
          city: summary.gameInfo.venue.address?.city,
          state: summary.gameInfo.venue.address?.state,
          capacity: summary.gameInfo.venue.capacity,
        }
      : null,
    home: {
      ...home,
      seasonStats: parseSeasonStats(homeSeasonStats),
    },
    away: {
      ...away,
      seasonStats: parseSeasonStats(awaySeasonStats),
    },
    homePlayers,
    awayPlayers,
    injuries: {
      home: injuries[homeId] || [],
      away: injuries[awayId] || [],
    },
    leaders,
    boxscore,
  };
}
