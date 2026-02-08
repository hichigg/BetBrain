import { getPendingPicks, markResolved } from '../models/picks.js';
import { getGamesForSport } from './aggregator.js';
import { normalize, nameScore } from './aggregator.js';

// ── Pick text parsers ───────────────────────────────────────────────

/**
 * Determine which team a pick refers to by matching pick text
 * against the home and away team names.
 * Returns 'home' | 'away' | null.
 */
function parsePickTeam(pickText, homeTeam, awayTeam) {
  if (!pickText || !homeTeam || !awayTeam) return null;

  const homeScore = nameScore(pickText, homeTeam);
  const awayScore = nameScore(pickText, awayTeam);

  // Also try matching just the team portion (before any number)
  const teamPart = pickText.replace(/[+-]?\d+(\.\d+)?$/, '').trim();
  const homeScore2 = teamPart ? nameScore(teamPart, homeTeam) : 0;
  const awayScore2 = teamPart ? nameScore(teamPart, awayTeam) : 0;

  const bestHome = Math.max(homeScore, homeScore2);
  const bestAway = Math.max(awayScore, awayScore2);

  if (bestHome >= 0.6 && bestHome > bestAway) return 'home';
  if (bestAway >= 0.6 && bestAway > bestHome) return 'away';
  return null;
}

/**
 * Extract the spread point value from pick text.
 * E.g. "Boston Celtics -3.5" → -3.5
 */
function parseSpreadPoint(pickText) {
  const match = pickText.match(/([+-]?\d+(?:\.\d+)?)\s*$/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Extract Over/Under direction and total line from pick text.
 * E.g. "Over 214.5" → { direction: 'over', line: 214.5 }
 */
function parseTotalLine(pickText) {
  const match = pickText.match(/\b(over|under)\s+(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return {
    direction: match[1].toLowerCase(),
    line: parseFloat(match[2]),
  };
}

// ── Resolution logic ────────────────────────────────────────────────

/**
 * Evaluate a single pick against a finished game.
 * Returns 'won' | 'lost' | 'push' | null (null = can't resolve).
 */
function evaluatePick(pick, game) {
  const homeScore = parseInt(game.home.score, 10);
  const awayScore = parseInt(game.away.score, 10);

  if (isNaN(homeScore) || isNaN(awayScore)) return null;

  const betType = pick.bet_type?.toLowerCase();

  // ── Moneyline ──
  if (betType === 'moneyline') {
    const side = parsePickTeam(pick.pick, game.home.name, game.away.name);
    if (!side) return null;

    if (homeScore === awayScore) return 'push';
    const homeWon = homeScore > awayScore;
    if (side === 'home') return homeWon ? 'won' : 'lost';
    return homeWon ? 'lost' : 'won';
  }

  // ── Spread ──
  if (betType === 'spread') {
    const side = parsePickTeam(pick.pick, game.home.name, game.away.name);
    const spread = parseSpreadPoint(pick.pick);
    if (!side || spread === null) return null;

    // "side -3.5" means side must win by more than 3.5
    const teamScore = side === 'home' ? homeScore : awayScore;
    const oppScore = side === 'home' ? awayScore : homeScore;
    const adjusted = teamScore + spread;

    if (adjusted > oppScore) return 'won';
    if (adjusted < oppScore) return 'lost';
    return 'push';
  }

  // ── Over/Under ──
  if (betType === 'over_under') {
    const parsed = parseTotalLine(pick.pick);
    if (!parsed) return null;

    const actualTotal = homeScore + awayScore;
    if (parsed.direction === 'over') {
      if (actualTotal > parsed.line) return 'won';
      if (actualTotal < parsed.line) return 'lost';
      return 'push';
    }
    // under
    if (actualTotal < parsed.line) return 'won';
    if (actualTotal > parsed.line) return 'lost';
    return 'push';
  }

  // ── Player props — skip ──
  if (betType === 'player_prop') return null;

  return null;
}

/**
 * Match a pick to a game from the ESPN games list.
 * Uses game_id first, then falls back to team name matching.
 */
function findGame(pick, games) {
  // Primary: match by game_id
  if (pick.game_id) {
    const byId = games.find((g) => g.id === pick.game_id);
    if (byId) return byId;
  }

  // Fallback: match by team names
  if (pick.home_team && pick.away_team) {
    let bestGame = null;
    let bestScore = 0;

    for (const game of games) {
      const homeMatch = nameScore(pick.home_team, game.home.name);
      const awayMatch = nameScore(pick.away_team, game.away.name);
      const combined = homeMatch + awayMatch;

      if (combined > bestScore && combined >= 1.0) {
        bestScore = combined;
        bestGame = game;
      }
    }
    return bestGame;
  }

  return null;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Auto-resolve all pending picks by checking ESPN final scores.
 * Returns the number of picks resolved.
 */
export async function resolveAllPending() {
  const pending = getPendingPicks();
  if (!pending.length) return 0;

  // Group picks by sport + date
  const groups = new Map();
  for (const pick of pending) {
    const key = `${pick.sport}:${pick.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pick);
  }

  let resolved = 0;

  for (const [key, picks] of groups) {
    const [sport, date] = key.split(':');
    if (!sport || !date) continue;

    try {
      const games = await getGamesForSport(sport, date);

      // Filter to final games only
      const finalGames = games.filter(
        (g) => g.status?.state === 'STATUS_FINAL',
      );
      if (!finalGames.length) continue;

      for (const pick of picks) {
        const game = findGame(pick, finalGames);
        if (!game) continue;

        const result = evaluatePick(pick, game);
        if (!result) continue;

        markResolved(pick.id, result, 'auto');
        resolved++;
        console.log(
          `Auto-resolved pick ${pick.id}: ${pick.pick} → ${result}`,
        );
      }
    } catch (err) {
      console.warn(`Resolver error for ${key}:`, err.message);
    }
  }

  if (resolved > 0) {
    console.log(`Auto-resolver: resolved ${resolved} pick(s)`);
  }

  return resolved;
}
