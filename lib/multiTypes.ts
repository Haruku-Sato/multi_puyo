import type { Field } from './types';

export interface RemotePlayer {
  name: string;
  field: Field | null;
  score: number;
  alive: boolean;
}

export type RoomPlayers = Record<string, RemotePlayer>;

// Client → Server
export type ClientMsg =
  | { type: 'JOIN'; name: string }
  | { type: 'STATE_UPDATE'; state: Omit<RemotePlayer, 'name'> }
  | { type: 'SEND_OJAMA'; amount: number }
  | { type: 'START_GAME' }
  | { type: 'GAME_OVER' };

// Server → Client
export type ServerMsg =
  | { type: 'ROOM_STATE'; players: RoomPlayers; gameStarted: boolean }
  | { type: 'PLAYER_UPDATE'; id: string; state: Omit<RemotePlayer, 'name'> }
  | { type: 'RECEIVE_OJAMA'; amount: number }
  | { type: 'PLAYER_DEAD'; id: string }
  | { type: 'GAME_START' }
  | { type: 'GAME_END'; winnerId: string | null };
