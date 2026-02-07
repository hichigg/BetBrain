import { Router } from 'express';
import { getGamesForSport, getGameDetail } from '../services/aggregator.js';
import { getSupportedSports } from '../utils/sportMappings.js';

const router = Router();

/**
 * GET /api/games?sport={sport}&date={YYYY-MM-DD}
 * Returns games for a sport on a date. If sport=all, fetches all sports.
 */
router.get('/', async (req, res) => {
  try {
    const { sport = 'all', date } = req.query;
    const gameDate = date || new Date().toISOString().split('T')[0];
    const sports = sport === 'all' ? getSupportedSports() : [sport];

    const results = await Promise.all(
      sports.map((s) => getGamesForSport(s, gameDate)),
    );
    const games = results.flat();

    res.json({ success: true, data: games });
  } catch (err) {
    console.error('GET /api/games error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch games' });
  }
});

/**
 * GET /api/games/:sport/:gameId
 * Returns detailed game data with team season stats, boxscore, etc.
 */
router.get('/:sport/:gameId', async (req, res) => {
  try {
    const { sport, gameId } = req.params;
    const detail = await getGameDetail(sport, gameId);

    if (!detail) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    res.json({ success: true, data: detail });
  } catch (err) {
    console.error('GET /api/games/:sport/:gameId error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch game detail' });
  }
});

export default router;
