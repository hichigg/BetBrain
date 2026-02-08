import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../betbrain.db');

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create tables ────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS picks (
    id              TEXT PRIMARY KEY,
    game_id         TEXT,
    sport           TEXT,
    date            TEXT,
    home_team       TEXT,
    away_team       TEXT,
    game_name       TEXT,
    bet_type        TEXT NOT NULL DEFAULT 'moneyline',
    pick            TEXT NOT NULL,
    odds            REAL NOT NULL,
    confidence      REAL,
    expected_value  TEXT,
    risk_tier       TEXT,
    units           REAL NOT NULL DEFAULT 1,
    reasoning       TEXT,
    result          TEXT DEFAULT 'pending',
    profit_loss     REAL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_picks_sport ON picks(sport);
  CREATE INDEX IF NOT EXISTS idx_picks_date ON picks(date);
  CREATE INDEX IF NOT EXISTS idx_picks_result ON picks(result);

  CREATE TABLE IF NOT EXISTS analysis_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sport           TEXT NOT NULL,
    date            TEXT NOT NULL,
    games_analyzed  INTEGER NOT NULL DEFAULT 0,
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    cost_estimate   REAL NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_analysis_log_date ON analysis_log(date);
`);

console.log('SQLite database initialized at', DB_PATH);

export default db;
