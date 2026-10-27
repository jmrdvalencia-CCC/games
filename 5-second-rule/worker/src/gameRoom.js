export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // name -> WebSocket
    this.gameState = null;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const name = url.searchParams.get('name');
      const role = url.searchParams.get('role');

      server.accept();
      this.sessions.set(name, { ws: server, role });

      // Restore state for reconnect
      if (this.gameState) server.send(JSON.stringify({ type: 'state', data: this.gameState }));

      server.addEventListener('message', async (evt) => {
        const msg = JSON.parse(evt.data);
        await this.handleMessage(name, role, msg);
      });

      server.addEventListener('close', () => this.sessions.delete(name));

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname.endsWith('/state') && request.method === 'GET') {
      return Response.json(this.gameState || {});
    }

    return new Response('Not found', { status: 404 });
  }

  async handleMessage(name, role, msg) {
    switch (msg.type) {
      case 'start_round':
        this.gameState = { ...this.gameState, status: 'hitting', round: msg.round };
        this.broadcast({ type: 'state', data: this.gameState });
        break;
      case 'close_hitting':
        this.gameState = { ...this.gameState, status: 'validating', submissions: msg.submissions };
        this.broadcast({ type: 'state', data: this.gameState });
        break;
      case 'round_done':
        this.gameState = { ...this.gameState, status: 'lobby', scores: msg.scores };
        this.broadcast({ type: 'state', data: this.gameState });
        break;
      case 'word_submitted':
        this.broadcast({ type: 'word_submitted', player: name, word: msg.word }, name);
        break;
      case 'game_ended':
        this.gameState = { ...this.gameState, status: 'ended', scores: msg.scores };
        this.broadcast({ type: 'state', data: this.gameState });
        break;
      case 'init':
        this.gameState = { roomCode: msg.roomCode, status: 'lobby', round: 0, scores: {} };
        this.broadcast({ type: 'player_joined', name });
        break;
    }
  }

  broadcast(msg, excludeName = null) {
    const data = JSON.stringify(msg);
    this.sessions.forEach(({ ws }, n) => {
      if (n !== excludeName) {
        try { ws.send(data); } catch {}
      }
    });
  }
}
