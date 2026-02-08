import { Router } from 'express';
import { analyzeGame, analyzeGamesForSport } from '../services/claude.js';
import { getGamesForSport, getGameDetail } from '../services/aggregator.js';
import { getSupportedSports } from '../utils/sportMappings.js';

const router = Router();

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * POST /api/picks/analyze
 * Trigger Claude analysis for a sport/date or a single game.
 * Body: { sport, date } or { sport, gameId }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { sport, date, gameId } = req.body;

    if (!sport) {
      return res.status(400).json({ success: false, error: 'sport is required' });
    }

    // Single-game analysis
    if (gameId) {
      const detail = await getGameDetail(sport, gameId);
      if (!detail) {
        return res.status(404).json({ success: false, error: 'Game not found' });
      }

      // Build a lightweight game object for analyzeGame from the detail
      const games = await getGamesForSport(sport, date || today());
      const game = games.find((g) => g.id === gameId);

      if (!game) {
        return res.status(404).json({ success: false, error: 'Game not found in scoreboard' });
      }

      const result = await analyzeGame(sport, game, detail);
      return res.json({ success: true, data: result });
    }

    // Batch analysis for a sport/date
    const analysisDate = date || today();
    const result = await analyzeGamesForSport(sport, analysisDate);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('POST /api/picks/analyze error:', err.message);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

/**
 * GET /api/picks?sport={sport}&date={date}
 * Retrieve picks for a sport/date. Uses cached analysis if available,
 * otherwise triggers a new analysis.
 */
router.get('/', async (req, res) => {
  try {
    const { sport, date } = req.query;

    if (!sport) {
      return res.status(400).json({ success: false, error: 'sport query param is required' });
    }

    const analysisDate = date || today();
    const result = await analyzeGamesForSport(sport, analysisDate);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /api/picks error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch picks' });
  }
});

/**
 * GET /api/picks/top?date={date}&limit=5
 * Returns the top N picks across ALL sports, sorted by confidence.
 */
router.get('/top', async (req, res) => {
  try {
    const date = req.query.date || today();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20);

    const sports = getSupportedSports();

    // Analyze all sports in parallel
    const results = await Promise.all(
      sports.map((sport) => analyzeGamesForSport(sport, date).catch(() => null)),
    );

    // Collect all picks across sports
    const allPicks = [];
    for (const result of results) {
      if (result?.allPicks) {
        allPicks.push(...result.allPicks);
      }
    }

    // Sort by confidence descending, then by EV
    allPicks.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const evA = parseFloat(a.expected_value) || 0;
      const evB = parseFloat(b.expected_value) || 0;
      return evB - evA;
    });

    return res.json({ success: true, data: allPicks.slice(0, limit) });
  } catch (err) {
    console.error('GET /api/picks/top error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch top picks' });
  }
});

export default router;
