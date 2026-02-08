import { Router } from 'express';
import {
  savePick,
  getPicks,
  updateResult,
  deletePick,
  getPickById,
} from '../models/picks.js';
import { resolveAllPending } from '../services/resolver.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/betslip?date=YYYY-MM-DD&sport=nba&result=pending
 * Returns saved picks for the authenticated user.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Auto-resolve any pending picks before returning
    try {
      await resolveAllPending();
    } catch (err) {
      console.warn('Auto-resolve on GET /api/betslip failed:', err.message);
    }

    const { date, sport, result } = req.query;
    const picks = getPicks({ date, sport, result, user_id: req.user.id });

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
 * Save a pick to the bet slip for the authenticated user.
 */
router.post('/', requireAuth, (req, res) => {
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
      date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
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
      user_id: req.user.id,
    });

    res.status(201).json({ success: true, data: mapPickToResponse(saved) });
  } catch (err) {
    console.error('POST /api/betslip error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save pick' });
  }
});

/**
 * PATCH /api/betslip/:id
 * Update result (won/lost/push/pending) — only if the pick belongs to the user.
 */
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body;

    if (result && !['pending', 'won', 'lost', 'push'].includes(result)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid result. Use: won, lost, push, pending' });
    }

    const existing = getPickById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Pick not found' });
    }
    if (existing.user_id && existing.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not your pick' });
    }

    const updated = updateResult(id, result);
    res.json({ success: true, data: mapPickToResponse(updated) });
  } catch (err) {
    console.error('PATCH /api/betslip/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update pick' });
  }
});

/**
 * DELETE /api/betslip/:id
 * Remove a pick — only if it belongs to the user.
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const existing = getPickById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Pick not found' });
    }
    if (existing.user_id && existing.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not your pick' });
    }

    const removed = deletePick(id);
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
    resolvedBy: row.resolved_by || null,
    timestamp: row.created_at,
  };
}

export default router;
