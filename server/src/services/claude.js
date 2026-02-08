import Anthropic from '@anthropic-ai/sdk';
import { getOrFetch, keys, TTL } from './cache.js';
import { getGamesForSport, getGameDetail } from './aggregator.js';
import { SYSTEM_PROMPT } from '../prompts/base.js';
import { TIMEOUTS } from '../utils/fetchWithTimeout.js';

const PROMPT_MODULES = {
  nfl: () => import('../prompts/nfl.js'),
  ncaaf: () => import('../prompts/ncaafb.js'),
  nba: () => import('../prompts/nba.js'),
  ncaab: () => import('../prompts/ncaamb.js'),
  mlb: () => import('../prompts/mlb.js'),
  nhl: () => import('../prompts/nhl.js'),
};

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.3;

const client = new Anthropic();

/** Running totals for cost monitoring */
let totalInputTokens = 0;
let totalOutputTokens = 0;

/**
 * Get the prompt builder for a sport.
 * @param {string} sport
 * @returns {Promise<(game: object, detail?: object) => string>}
 */
async function getBuilder(sport) {
  const loader = PROMPT_MODULES[sport];
  if (!loader) throw new Error(`No prompt template for sport: ${sport}`);
  const mod = await loader();
  return mod.buildPrompt;
}

// ── Response parsing ────────────────────────────────────────────────

const REQUIRED_FIELDS = ['bet_type', 'pick', 'confidence', 'risk_tier', 'reasoning'];
const VALID_BET_TYPES = ['spread', 'moneyline', 'over_under', 'player_prop'];
const VALID_RISK_TIERS = ['low', 'medium', 'high'];

/**
 * Robustly parse Claude's JSON response.
 * Handles raw JSON, markdown code blocks, and partial/malformed output.
 *
 * @param {string} raw - Raw text from Claude
 * @returns {object} Parsed object with game_summary and recommendations[]
 */
export function parseClaudeResponse(raw) {
  let text = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Try direct parse
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract the first JSON object from the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      console.error('Claude response contains no parseable JSON');
      return { game_summary: 'Failed to parse analysis', recommendations: [] };
    }
    try {
      parsed = JSON.parse(objectMatch[0]);
    } catch {
      console.error('Claude response JSON extraction failed');
      return { game_summary: 'Failed to parse analysis', recommendations: [] };
    }
  }

  // Normalize structure
  const result = {
    game_summary: parsed.game_summary || parsed.summary || '',
    recommendations: [],
  };

  const recs = parsed.recommendations || parsed.picks || [];
  for (const rec of recs) {
    // Validate required fields
    const missing = REQUIRED_FIELDS.filter((f) => rec[f] === undefined);
    if (missing.length > 0) {
      console.warn('Skipping recommendation missing fields:', missing);
      continue;
    }

    result.recommendations.push({
      bet_type: VALID_BET_TYPES.includes(rec.bet_type) ? rec.bet_type : 'moneyline',
      pick: String(rec.pick),
      odds: rec.odds || null,
      confidence: Math.max(1, Math.min(10, Math.round(Number(rec.confidence)))),
      expected_value: rec.expected_value || null,
      risk_tier: VALID_RISK_TIERS.includes(rec.risk_tier) ? rec.risk_tier : 'medium',
      units: Math.max(1, Math.min(5, Math.round(Number(rec.units) || 1))),
      reasoning: String(rec.reasoning),
    });
  }

  return result;
}

// ── Single game analysis ────────────────────────────────────────────

/**
 * Analyze a single game using Claude with the sport-specific prompt.
 *
 * @param {string} sport - App sport key (e.g. 'nba')
 * @param {object} gameData - Aggregated game object from the aggregator
 * @param {object} [detail] - Optional deep detail from getGameDetail
 * @returns {Promise<object>} Parsed analysis with game_summary and recommendations
 */
export async function analyzeGame(sport, gameData, detail = null) {
  const cacheKey = keys.analysis(sport, gameData.date?.split('T')[0] || 'unknown', gameData.id);

  return getOrFetch(cacheKey, async () => {
    const buildPrompt = await getBuilder(sport);
    const userPrompt = buildPrompt(gameData, detail);

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        timeout: TIMEOUTS.CLAUDE,
      });

      // Track token usage
      const usage = response.usage || {};
      totalInputTokens += usage.input_tokens || 0;
      totalOutputTokens += usage.output_tokens || 0;
      console.log(
        `Claude [${sport}/${gameData.id}]: ${usage.input_tokens || '?'} in / ${usage.output_tokens || '?'} out` +
        ` | Session total: ${totalInputTokens} in / ${totalOutputTokens} out`,
      );

      const text = response.content?.[0]?.text || '';
      const parsed = parseClaudeResponse(text);

      // Tag each recommendation with the game it belongs to
      for (const rec of parsed.recommendations) {
        rec.gameId = gameData.id;
        rec.gameName = gameData.shortName || gameData.name;
        rec.sport = sport;
      }

      return { gameId: gameData.id, gameName: gameData.shortName || gameData.name, ...parsed };
    } catch (err) {
      const isTimeout = err.message?.includes('timeout') || err.message?.includes('timed out');
      console.error(`Claude analysis ${isTimeout ? 'timed out' : 'failed'} [${sport}/${gameData.id}]:`, err.message);
      return {
        gameId: gameData.id,
        gameName: gameData.shortName || gameData.name,
        game_summary: isTimeout ? 'Analysis unavailable — request timed out. Try again later.' : `Analysis failed: ${err.message}`,
        recommendations: [],
      };
    }
  }, TTL.ANALYSIS);
}

// ── Batch analysis for a sport/date ─────────────────────────────────

/**
 * Fetch all games for a sport/date, batch into a single Claude call,
 * and return all recommendations sorted by confidence.
 *
 * @param {string} sport - App sport key
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<object>} { games: analysisPerGame[], allPicks: sortedRecommendations[] }
 */
export async function analyzeGamesForSport(sport, date) {
  const games = await getGamesForSport(sport, date);

  // Filter to pre-game or in-progress games that have odds
  const analyzable = games.filter(
    (g) => g.status?.state !== 'STATUS_FINAL' && g.odds,
  );

  if (analyzable.length === 0) {
    return {
      sport,
      date,
      games: [],
      allPicks: [],
      message: games.length > 0
        ? 'No analyzable games (all final or missing odds)'
        : 'No games scheduled',
    };
  }

  // Batch: build one combined prompt for all games
  const buildPrompt = await getBuilder(sport);
  const batchCacheKey = `analysis:batch:${sport}:${date}`;

  const result = await getOrFetch(batchCacheKey, async () => {
    // Build individual prompts and combine
    const gamePrompts = analyzable.map((game, i) => {
      const prompt = buildPrompt(game);
      return `\n${'='.repeat(60)}\nGAME ${i + 1} of ${analyzable.length}\n${'='.repeat(60)}\n${prompt}`;
    });

    const batchPrompt = `You are analyzing ${analyzable.length} ${sport.toUpperCase()} games. ` +
      `Provide a separate analysis for EACH game. ` +
      `Return a JSON object with a "games" array, where each element has the standard format ` +
      `(game_summary and recommendations). Include the game matchup name in each element as "matchup".\n` +
      `\nResponse format:\n{\n  "games": [\n    {\n      "matchup": "Team A at Team B",\n` +
      `      "game_summary": "...",\n      "recommendations": [...]\n    }\n  ]\n}\n` +
      gamePrompts.join('\n');

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS * 2, // More tokens for batch
        temperature: TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: batchPrompt }],
        timeout: TIMEOUTS.CLAUDE,
      });

      const usage = response.usage || {};
      totalInputTokens += usage.input_tokens || 0;
      totalOutputTokens += usage.output_tokens || 0;
      console.log(
        `Claude BATCH [${sport}/${date}]: ${usage.input_tokens || '?'} in / ${usage.output_tokens || '?'} out` +
        ` | Session total: ${totalInputTokens} in / ${totalOutputTokens} out`,
      );

      const text = response.content?.[0]?.text || '';
      const parsed = parseClaudeResponse(text);

      // If Claude returned the batch format with a games array
      if (parsed.recommendations.length === 0 && text.includes('"games"')) {
        return parseBatchResponse(text, analyzable, sport);
      }

      // Fallback: single-game format returned for batch (shouldn't happen but handle it)
      const tagged = parsed.recommendations.map((rec) => ({
        ...rec,
        gameId: analyzable[0]?.id,
        gameName: analyzable[0]?.shortName,
        sport,
      }));

      return {
        sport,
        date,
        games: [{ gameId: analyzable[0]?.id, gameName: analyzable[0]?.shortName, ...parsed }],
        allPicks: tagged.sort((a, b) => b.confidence - a.confidence),
      };
    } catch (err) {
      const isTimeout = err.message?.includes('timeout') || err.message?.includes('timed out');
      console.error(`Claude batch analysis ${isTimeout ? 'timed out' : 'failed'} [${sport}/${date}]:`, err.message);
      return {
        sport,
        date,
        games: [],
        allPicks: [],
        message: isTimeout ? 'Analysis unavailable — request timed out. Try again later.' : `Analysis failed: ${err.message}`,
      };
    }
  }, TTL.ANALYSIS);

  return result;
}

/**
 * Parse a batch response where Claude returns { games: [...] }.
 */
function parseBatchResponse(raw, analyzableGames, sport) {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { parsed = JSON.parse(objectMatch[0]); } catch { parsed = null; }
    }
  }

  if (!parsed?.games) {
    return { sport, date: '', games: [], allPicks: [], message: 'Failed to parse batch response' };
  }

  const allPicks = [];
  const games = parsed.games.map((gameAnalysis, i) => {
    const matchedGame = analyzableGames[i];
    const gameId = matchedGame?.id || `unknown-${i}`;
    const gameName = gameAnalysis.matchup || matchedGame?.shortName || `Game ${i + 1}`;

    const recs = (gameAnalysis.recommendations || []).map((rec) => {
      const validated = {
        bet_type: VALID_BET_TYPES.includes(rec.bet_type) ? rec.bet_type : 'moneyline',
        pick: String(rec.pick || ''),
        odds: rec.odds || null,
        confidence: Math.max(1, Math.min(10, Math.round(Number(rec.confidence) || 5))),
        expected_value: rec.expected_value || null,
        risk_tier: VALID_RISK_TIERS.includes(rec.risk_tier) ? rec.risk_tier : 'medium',
        units: Math.max(1, Math.min(5, Math.round(Number(rec.units) || 1))),
        reasoning: String(rec.reasoning || ''),
        gameId,
        gameName,
        sport,
      };
      allPicks.push(validated);
      return validated;
    });

    return {
      gameId,
      gameName,
      game_summary: gameAnalysis.game_summary || '',
      recommendations: recs,
    };
  });

  allPicks.sort((a, b) => b.confidence - a.confidence);

  return { sport, games, allPicks };
}

// ── Usage stats ─────────────────────────────────────────────────────

/**
 * Get cumulative token usage for this server session.
 * @returns {{ inputTokens: number, outputTokens: number }}
 */
export function getTokenUsage() {
  return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
}
