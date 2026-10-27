import { GameRoom } from './gameRoom.js';
import {
  createRoom, getRoom, updateRoomStatus, incrementRound,
  addPlayer, getPlayers, addSubmission, getSubmissions,
  removeSubmission, awardPoints, resetAll
} from './db.js';

export { GameRoom };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS });
}

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function getDO(env, roomCode) {
  const id = env.GAME_ROOM.idFromName(roomCode);
  return env.GAME_ROOM.get(id);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // WebSocket upgrade → forward to Durable Object
    if (request.headers.get('Upgrade') === 'websocket') {
      const roomCode = url.searchParams.get('room');
      if (!roomCode) return new Response('Missing room', { status: 400 });
      return getDO(env, roomCode).fetch(request);
    }

    // REST API
    if (path === '/api/room' && request.method === 'POST') {
      const { pitcherName } = await request.json();
      let code, exists;
      do {
        code = generateCode();
        exists = await getRoom(env.DB, code);
      } while (exists);
      await createRoom(env.DB, code, pitcherName);
      await addPlayer(env.DB, code, pitcherName);
      return json({ code });
    }

    if (path === '/api/room/join' && request.method === 'POST') {
      const { code, name } = await request.json();
      const room = await getRoom(env.DB, code);
      if (!room) return json({ error: 'Room not found' }, 404);
      if (room.status === 'ended') return json({ error: 'Game has ended' }, 400);
      const players = await getPlayers(env.DB, code);
      if (players.find(p => p.name === name)) return json({ error: 'Name already taken' }, 400);
      await addPlayer(env.DB, code, name);
      return json({ room });
    }

    const roomMatch = path.match(/^\/api\/room\/([A-Z0-9]+)(\/.*)?$/);
    if (roomMatch) {
      const code = roomMatch[1];
      const sub = roomMatch[2] || '';

      if (sub === '' && request.method === 'GET') {
        const room = await getRoom(env.DB, code);
        if (!room) return json({ error: 'Not found' }, 404);
        const players = await getPlayers(env.DB, code);
        return json({ room, players });
      }

      if (sub === '/start' && request.method === 'POST') {
        await incrementRound(env.DB, code);
        await updateRoomStatus(env.DB, code, 'hitting');
        const room = await getRoom(env.DB, code);
        const do_ = getDO(env, code);
        await do_.fetch(new Request(`http://do/state`, { method: 'GET' }));
        return json({ round: room.current_round });
      }

      if (sub === '/submit' && request.method === 'POST') {
        const { playerName, word, round } = await request.json();
        await addSubmission(env.DB, code, round, playerName, word.trim());
        return json({ ok: true });
      }

      if (sub === '/close' && request.method === 'POST') {
        await updateRoomStatus(env.DB, code, 'validating');
        const room = await getRoom(env.DB, code);
        const subs = await getSubmissions(env.DB, code, room.current_round);
        return json({ submissions: subs });
      }

      if (sub === '/remove' && request.method === 'POST') {
        const { id } = await request.json();
        await removeSubmission(env.DB, id);
        const room = await getRoom(env.DB, code);
        const subs = await getSubmissions(env.DB, code, room.current_round);
        return json({ submissions: subs });
      }

      if (sub === '/award' && request.method === 'POST') {
        const room = await getRoom(env.DB, code);
        await awardPoints(env.DB, code, room.current_round);
        await updateRoomStatus(env.DB, code, 'lobby');
        const players = await getPlayers(env.DB, code);
        return json({ players });
      }

      if (sub === '/end' && request.method === 'POST') {
        await updateRoomStatus(env.DB, code, 'ended');
        const players = await getPlayers(env.DB, code);
        return json({ players });
      }
    }

    if (path === '/api/reset' && request.method === 'DELETE') {
      await resetAll(env.DB);
      return json({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  }
};
