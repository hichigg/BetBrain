import db from './db.js';

// ── Date range helpers ───────────────────────────────────────────────

function rangeToDate(range) {
  const now = new Date();
  const days = { '1d': 1, '7d': 7, '14d': 14, '30d': 30, '90d': 90, all: 0 };
  const d = days[range];
  if (d === undefined || d === 0) return null; // no filter
  now.setDate(now.getDate() - d);
  return now.toISOString().split('T')[0];
}

// ── Query functions ──────────────────────────────────────────────────

/**
 * Get overall performance summary for a date range.
 * @param {string} range - e.g. '7d', '30d', 'all'
 */
export function getSummary(range = '7d') {
  const since = rangeToDate(range);
  const whereClause = since ? 'WHERE date >= @since' : '';
  const params = since ? { since } : {};

  const settled = db
    .prepare(
      `SELECT result, COUNT(*) as count, SUM(profit_loss) as total_profit,
              SUM(units) as total_wagered
       FROM picks
       ${whereClause} AND result != 'pending'
       GROUP BY result`.replace('AND', since ? 'AND' : 'WHERE'),
    )
    .all(params);

  const pending = db
    .prepare(
      `SELECT COUNT(*) as count FROM picks ${whereClause}${since ? ' AND' : ' WHERE'} result = 'pending'`,
    )
    .get(params);

  let wins = 0,
    losses = 0,
    pushes = 0,
    totalProfit = 0,
    totalWagered = 0;

  for (const row of settled) {
    if (row.result === 'won') {
      wins = row.count;
      totalProfit += row.total_profit;
      totalWagered += row.total_wagered;
    } else if (row.result === 'lost') {
      losses = row.count;
      totalProfit += row.total_profit;
      totalWagered += row.total_wagered;
    } else if (row.result === 'push') {
      pushes = row.count;
    }
  }

  const roi = totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0;

  return {
    range,
    record: { wins, losses, pushes },
    totalPicks: wins + losses + pushes + (pending?.count || 0),
    pendingPicks: pending?.count || 0,
    units: parseFloat(totalProfit.toFixed(2)),
    totalWagered: parseFloat(totalWagered.toFixed(2)),
    roi: parseFloat(roi.toFixed(1)),
  };
}

/**
 * Get performance breakdown by sport.
 */
export function getBySport() {
  const rows = db
    .prepare(
      `SELECT sport,
              COUNT(*) as total,
              SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN result = 'lost' THEN 1 ELSE 0 END) as losses,
              SUM(CASE WHEN result = 'push' THEN 1 ELSE 0 END) as pushes,
              SUM(CASE WHEN result != 'pending' THEN profit_loss ELSE 0 END) as profit,
              SUM(CASE WHEN result != 'pending' THEN units ELSE 0 END) as wagered
       FROM picks
       WHERE sport IS NOT NULL
       GROUP BY sport
       ORDER BY profit DESC`,
    )
    .all();

  return rows.map((r) => ({
    sport: r.sport,
    total: r.total,
    record: { wins: r.wins, losses: r.losses, pushes: r.pushes },
    profit: parseFloat((r.profit || 0).toFixed(2)),
    roi: r.wagered > 0 ? parseFloat(((r.profit / r.wagered) * 100).toFixed(1)) : 0,
  }));
}

/**
 * Get performance breakdown by bet type.
 */
export function getByBetType() {
  const rows = db
    .prepare(
      `SELECT bet_type,
              COUNT(*) as total,
              SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN result = 'lost' THEN 1 ELSE 0 END) as losses,
              SUM(CASE WHEN result = 'push' THEN 1 ELSE 0 END) as pushes,
              SUM(CASE WHEN result != 'pending' THEN profit_loss ELSE 0 END) as profit,
              SUM(CASE WHEN result != 'pending' THEN units ELSE 0 END) as wagered
       FROM picks
       GROUP BY bet_type
       ORDER BY profit DESC`,
    )
    .all();

  return rows.map((r) => ({
    bet_type: r.bet_type,
    total: r.total,
    record: { wins: r.wins, losses: r.losses, pushes: r.pushes },
    profit: parseFloat((r.profit || 0).toFixed(2)),
    roi: r.wagered > 0 ? parseFloat(((r.profit / r.wagered) * 100).toFixed(1)) : 0,
  }));
}

/**
 * Get ROI over time (daily buckets).
 * @param {string} range
 */
export function getROI(range = '30d') {
  const since = rangeToDate(range);
  const whereClause = since ? 'WHERE date >= @since' : '';
  const params = since ? { since } : {};

  return db
    .prepare(
      `SELECT date,
              SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN result = 'lost' THEN 1 ELSE 0 END) as losses,
              SUM(CASE WHEN result != 'pending' THEN profit_loss ELSE 0 END) as profit,
              SUM(CASE WHEN result != 'pending' THEN units ELSE 0 END) as wagered
       FROM picks
       ${whereClause}
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(params);
}
