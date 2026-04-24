import type * as Party from 'partykit/server';
import type { RemotePlayer, RoomPlayers, ClientMsg } from '../lib/multiTypes';

export default class PuyoRoom implements Party.Server {
  options: Party.ServerOptions = { hibernate: false };

  private players: Map<string, RemotePlayer> = new Map();
  private gameStarted = false;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({
      type: 'ROOM_STATE',
      players: this.toObj(),
      gameStarted: this.gameStarted,
    }));
  }

  onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMsg;

    switch (msg.type) {
      case 'JOIN': {
        this.players.set(sender.id, { name: msg.name, field: null, score: 0, alive: true });
        this.broadcast({ type: 'ROOM_STATE', players: this.toObj(), gameStarted: this.gameStarted });
        break;
      }
      case 'STATE_UPDATE': {
        const p = this.players.get(sender.id);
        if (p) this.players.set(sender.id, { ...p, ...msg.state });
        this.room.broadcast(
          JSON.stringify({ type: 'PLAYER_UPDATE', id: sender.id, state: msg.state }),
          [sender.id],
        );
        break;
      }
      case 'SEND_OJAMA': {
        const targets = [...this.players.entries()]
          .filter(([id, p]) => id !== sender.id && p.alive)
          .map(([id]) => id);
        if (targets.length === 0 || msg.amount <= 0) break;
        const each = Math.ceil(msg.amount / targets.length);
        for (const conn of this.room.getConnections()) {
          if (targets.includes(conn.id)) {
            conn.send(JSON.stringify({ type: 'RECEIVE_OJAMA', amount: each }));
          }
        }
        break;
      }
      case 'START_GAME': {
        if (this.players.size < 1) break;
        this.gameStarted = true;
        for (const [id, p] of this.players) {
          this.players.set(id, { ...p, alive: true, score: 0, field: null });
        }
        this.broadcast({ type: 'GAME_START' });
        break;
      }
      case 'GAME_OVER': {
        const p = this.players.get(sender.id);
        if (p) this.players.set(sender.id, { ...p, alive: false });
        this.broadcast({ type: 'PLAYER_DEAD', id: sender.id });
        const alive = [...this.players.entries()].filter(([, p]) => p.alive);
        if (alive.length <= 1) {
          this.gameStarted = false;
          this.broadcast({ type: 'GAME_END', winnerId: alive[0]?.[0] ?? null });
        }
        break;
      }
    }
  }

  onClose(conn: Party.Connection) {
    this.players.delete(conn.id);
    this.broadcast({ type: 'ROOM_STATE', players: this.toObj(), gameStarted: this.gameStarted });
  }

  private toObj(): RoomPlayers {
    return Object.fromEntries(this.players);
  }

  private broadcast(msg: object) {
    this.room.broadcast(JSON.stringify(msg));
  }
}
