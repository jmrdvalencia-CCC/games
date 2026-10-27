CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  pitcher_name TEXT NOT NULL,
  status TEXT DEFAULT 'lobby',
  current_round INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code TEXT NOT NULL,
  name TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  UNIQUE(room_code, name)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code TEXT NOT NULL,
  round INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  word TEXT NOT NULL,
  valid INTEGER DEFAULT 1
);
