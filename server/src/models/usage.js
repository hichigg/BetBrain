import db from './db.js';

const getCountStmt = db.prepare(
  'SELECT analyses FROM daily_usage WHERE user_id = ? AND date = ?',
);

const incrementStmt = db.prepare(`
  INSERT INTO daily_usage (user_id, date, analyses) VALUES (@user_id, @date, 1)
  ON CONFLICT(user_id, date) DO UPDATE SET analyses = analyses + 1
`);

export function getAnalysisCount(userId, date) {
  const row = getCountStmt.get(userId, date);
  return row ? row.analyses : 0;
}

export function incrementAnalysis(userId, date) {
  incrementStmt.run({ user_id: userId, date });
}
