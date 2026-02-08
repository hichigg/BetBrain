import crypto from 'crypto';
import db from './db.js';

// ── Prepared statements ──────────────────────────────────────────────

const insertStmt = db.prepare(`
  INSERT INTO picks (id, game_id, sport, date, home_team, away_team, game_name,
    bet_type, pick, odds, confidence, expected_value, risk_tier, units, reasoning,
    result, profit_loss, created_at)
  VALUES (@id, @game_id, @sport, @date, @home_team, @away_team, @game_name,
    @bet_type, @pick, @odds, @confidence, @expected_value, @risk_tier, @units,
    @reasoning, @result, @profit_loss, @created_at)
`);

const getByIdStmt = db.prepare('SELECT * FROM picks WHERE id = ?');

const updateResultStmt = db.prepare(`
  UPDATE picks SET result = @result, profit_loss = @profit_loss WHERE id = @id
`);

const deleteStmt = db.prepare('DELETE FROM picks WHERE id = ?');

// ── Helpers ──────────────────────────────────────────────────────────

function calcProfit(odds, units, result) {
  if (result === 'won') {
    const payout =
      odds > 0 ? units * (odds / 100) : units * (100 / Math.abs(odds));
    return parseFloat(payout.toFixed(2));
  }
  if (result === 'lost') return -units;
  return 0; // push or pending
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ── CRUD functions ───────────────────────────────────────────────────

/**
 * Save a new pick to the database.
 */
export function savePick({
  game_id,
  sport,
  date,
  home_team,
  away_team,
  game_name,
  bet_type = 'moneyline',
  pick,
  odds,
  confidence,
  expected_value,
  risk_tier,
  units = 1,
  reasoning,
}) {
  const row = {
    id: crypto.randomUUID(),
    game_id: game_id || null,
    sport: sport || null,
    date: date || todayStr(),
    home_team: home_team || null,
    away_team: away_team || null,
    game_name: game_name || null,
    bet_type,
    pick,
    odds: typeof odds === 'number' ? odds : parseFloat(odds) || 0,
    confidence: confidence != null ? Number(confidence) : null,
    expected_value: expected_value || null,
    risk_tier: risk_tier || null,
    units: parseFloat(units) || 1,
    reasoning: reasoning || null,
    result: 'pending',
    profit_loss: 0,
    created_at: new Date().toISOString(),
  };

  insertStmt.run(row);
  return row;
}

/**
 * Get picks with optional filters.
 * @param {{ sport?: string, date?: string, result?: string }} filters
 */
export function getPicks(filters = {}) {
  const clauses = [];
  const params = {};

  if (filters.sport) {
    clauses.push('sport = @sport');
    params.sport = filters.sport;
  }
  if (filters.date) {
    clauses.push('date = @date');
    params.date = filters.date;
  }
  if (filters.result) {
    clauses.push('result = @result');
    params.result = filters.result;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT * FROM picks ${where} ORDER BY created_at DESC`);
  return stmt.all(params);
}

/**
 * Get picks for a specific date (shortcut).
 */
export function getPicksByDate(date) {
  return getPicks({ date });
}

/**
 * Update a pick's result and recalculate profit.
 */
export function updateResult(id, result) {
  const existing = getByIdStmt.get(id);
  if (!existing) return null;

  const profit_loss = calcProfit(existing.odds, existing.units, result);
  updateResultStmt.run({ id, result, profit_loss });

  return { ...existing, result, profit_loss };
}

/**
 * Delete a pick.
 */
export function deletePick(id) {
  const existing = getByIdStmt.get(id);
  if (!existing) return null;

  deleteStmt.run(id);
  return existing;
}

/**
 * Get a single pick by ID.
 */
export function getPickById(id) {
  return getByIdStmt.get(id) || null;
}
