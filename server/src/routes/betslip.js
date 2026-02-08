import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// ── In-memory store (replaced by SQLite in Phase 4) ─────────────────

const slips = [];

// ── Helpers ──────────────────────────────────────────────────────────

function findIndex(id) {
  return slips.findIndex((s) => s.id === id);
}

function calcProfit(slip) {
  if (slip.result === 'won') {
    const odds = slip.odds;
    const payout =
      odds > 0 ? slip.units * (odds / 100) : slip.units * (100 / Math.abs(odds));
    return parseFloat(payout.toFixed(2));
  }
  if (slip.result === 'lost') return -slip.units;
  return 0; // push or pending
}

// ── Routes ───────────────────────────────────────────────────────────

/**
 * GET /api/betslip?date=YYYY-MM-DD
 * Returns all saved picks, optionally filtered by date.
 */
router.get('/', (req, res) => {
  const { date } = req.query;
  let result = slips;

  if (date) {
    result = slips.filter((s) => s.timestamp.startsWith(date));
  }

  // Newest first
  result = [...result].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  );

  res.json({ success: true, data: result });
});

/**
 * POST /api/betslip
 * Save a pick to the bet slip.
 */
router.post('/', (req, res) => {
  const {
    sport,
    gameId,
    gameName,
    pick,
    bet_type,
    odds,
    confidence,
    expected_value,
    risk_tier,
    units,
    reasoning,
  } = req.body;

  if (!pick || odds == null || !units) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing required fields: pick, odds, units' });
  }

  const slip = {
    id: crypto.randomUUID(),
    sport: sport || null,
    gameId: gameId || null,
    gameName: gameName || null,
    pick,
    bet_type: bet_type || 'moneyline',
    odds: typeof odds === 'number' ? odds : parseFloat(odds) || 0,
    confidence: confidence != null ? Number(confidence) : null,
    expected_value: expected_value || null,
    risk_tier: risk_tier || null,
    units: parseFloat(units) || 1,
    reasoning: reasoning || null,
    result: 'pending', // pending | won | lost | push
    profit: 0,
    timestamp: new Date().toISOString(),
  };

  slips.push(slip);
  res.status(201).json({ success: true, data: slip });
});

/**
 * PATCH /api/betslip/:id
 * Update result (won/lost/push) and recalculate profit.
 */
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const idx = findIndex(id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Pick not found' });
  }

  const { result } = req.body;

  if (result && !['pending', 'won', 'lost', 'push'].includes(result)) {
    return res
      .status(400)
      .json({ success: false, error: 'Invalid result. Use: won, lost, push, pending' });
  }

  if (result) {
    slips[idx].result = result;
    slips[idx].profit = calcProfit(slips[idx]);
  }

  res.json({ success: true, data: slips[idx] });
});

/**
 * DELETE /api/betslip/:id
 * Remove a pick from the bet slip.
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const idx = findIndex(id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Pick not found' });
  }

  const [removed] = slips.splice(idx, 1);
  res.json({ success: true, data: removed });
});

export default router;
