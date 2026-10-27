export async function createRoom(db, code, pitcherName) {
  await db.prepare('INSERT INTO rooms (code, pitcher_name) VALUES (?, ?)').bind(code, pitcherName).run();
}

export async function getRoom(db, code) {
  return db.prepare('SELECT * FROM rooms WHERE code = ?').bind(code).first();
}

export async function updateRoomStatus(db, code, status) {
  await db.prepare('UPDATE rooms SET status = ? WHERE code = ?').bind(status, code).run();
}

export async function incrementRound(db, code) {
  await db.prepare('UPDATE rooms SET current_round = current_round + 1 WHERE code = ?').bind(code).run();
}

export async function addPlayer(db, roomCode, name) {
  await db.prepare('INSERT OR IGNORE INTO players (room_code, name) VALUES (?, ?)').bind(roomCode, name).run();
}

export async function getPlayers(db, roomCode) {
  return (await db.prepare('SELECT * FROM players WHERE room_code = ?').bind(roomCode).all()).results;
}

export async function addSubmission(db, roomCode, round, playerName, word) {
  const exists = await db.prepare(
    'SELECT id FROM submissions WHERE room_code=? AND round=? AND player_name=? AND word=?'
  ).bind(roomCode, round, playerName, word.toLowerCase()).first();
  if (!exists) {
    await db.prepare('INSERT INTO submissions (room_code, round, player_name, word) VALUES (?,?,?,?)')
      .bind(roomCode, round, playerName, word.toLowerCase()).run();
  }
}

export async function getSubmissions(db, roomCode, round) {
  return (await db.prepare('SELECT * FROM submissions WHERE room_code=? AND round=?').bind(roomCode, round).all()).results;
}

export async function removeSubmission(db, id) {
  await db.prepare('UPDATE submissions SET valid=0 WHERE id=?').bind(id).run();
}

export async function awardPoints(db, roomCode, round) {
  const subs = await getSubmissions(db, roomCode, round);
  const valid = subs.filter(s => s.valid === 1);

  // Count word frequency across players
  const wordCount = {};
  valid.forEach(s => { wordCount[s.word] = (wordCount[s.word] || 0) + 1; });

  // Unique words per player (submitted by only that player)
  const playerUnique = {};
  valid.forEach(s => {
    if (wordCount[s.word] === 1) {
      playerUnique[s.player_name] = (playerUnique[s.player_name] || 0) + 1;
    }
  });

  // Award 1 point per 3 unique words
  for (const [name, count] of Object.entries(playerUnique)) {
    const pts = Math.floor(count / 3);
    if (pts > 0) {
      await db.prepare('UPDATE players SET points = points + ? WHERE room_code=? AND name=?')
        .bind(pts, roomCode, name).run();
    }
  }
}

export async function resetAll(db) {
  await db.prepare('DELETE FROM submissions').run();
  await db.prepare('DELETE FROM players').run();
  await db.prepare('DELETE FROM rooms').run();
}
