const path = require('path');
const { DatabaseSync } = require('node:sqlite'); // built into Node.js 22.13+, nothing extra to install
const { DATA_DIR } = require('./config');

const db = new DatabaseSync(path.join(DATA_DIR, 'finwise.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id       TEXT PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type     TEXT NOT NULL CHECK (type IN ('income','expense')),
  descr    TEXT NOT NULL,
  amount   REAL NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('income','needs','wants','savings')),
  date     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_tx_user_date ON transactions (user_id, date);

CREATE TABLE IF NOT EXISTS goals (
  id       TEXT PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  target   REAL NOT NULL CHECK (target > 0),
  saved    REAL NOT NULL DEFAULT 0 CHECK (saved >= 0),
  deadline TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_goals_user ON goals (user_id);
`);

module.exports = db;
