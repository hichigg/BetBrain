import { Router } from 'express';
import {
  savePick,
  getPicks,
  updateResult,
  deletePick,
} from '../models/picks.js';

const router = Router();

/**
 * GET /api/betslip?date=YYYY-MM-DD&sport=nba&result=pending
 * Returns saved picks with optional filters.
 */
router.get('/', (req, res) => {
  try {
    const { date, sport, result } = req.query;
    const picks = getPicks({ date, sport, result });

    // Map DB column names to what the frontend expects
    const data = picks.map(mapPickToResponse);
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/betslip error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch picks' });
  }
});

/**
 * POST /api/betslip
 * Save a pick to the bet slip.
 */
router.post('/', (req, res) => {
  try {
    const { pick, odds, units } = req.body;

    if (!pick || odds == null || !units) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields: pick, odds, units' });
    }

    const saved = savePick({
      game_id: req.body.gameId,
      sport: req.body.sport,
      date: new Date().toISOString().split('T')[0],
      home_team: req.body.homeTeam,
      away_team: req.body.awayTeam,
      game_name: req.body.gameName,
      bet_type: req.body.bet_type,
      pick,
      odds,
      confidence: req.body.confidence,
      expected_value: req.body.expected_value,
      risk_tier: req.body.risk_tier,
      units,
      reasoning: req.body.reasoning,
    });

    res.status(201).json({ success: true, data: mapPickToResponse(saved) });
  } catch (err) {
    console.error('POST /api/betslip error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save pick' });
  }
});

/**
 * PATCH /api/betslip/:id
 * Update result (won/lost/push/pending) and recalculate profit.
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body;

    if (result && !['pending', 'won', 'lost', 'push'].includes(result)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid result. Use: won, lost, push, pending' });
    }

    const updated = updateResult(id, result);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Pick not found' });
    }

    res.json({ success: true, data: mapPickToResponse(updated) });
  } catch (err) {
    console.error('PATCH /api/betslip/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update pick' });
  }
});

/**
 * DELETE /api/betslip/:id
 * Remove a pick from the bet slip.
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const removed = deletePick(id);

    if (!removed) {
      return res.status(404).json({ success: false, error: 'Pick not found' });
    }

    res.json({ success: true, data: mapPickToResponse(removed) });
  } catch (err) {
    console.error('DELETE /api/betslip/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete pick' });
  }
});

// ── Response mapper ──────────────────────────────────────────────────

function mapPickToResponse(row) {
  return {
    id: row.id,
    sport: row.sport,
    gameId: row.game_id,
    gameName: row.game_name,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    pick: row.pick,
    bet_type: row.bet_type,
    odds: row.odds,
    confidence: row.confidence,
    expected_value: row.expected_value,
    risk_tier: row.risk_tier,
    units: row.units,
    reasoning: row.reasoning,
    result: row.result,
    profit: row.profit_loss,
    timestamp: row.created_at,
  };
}

export default router;
