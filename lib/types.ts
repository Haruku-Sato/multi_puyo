export type PuyoColor = 'red' | 'blue' | 'green' | 'yellow' | 'ojama' | null;

export interface Cell {
  color: PuyoColor;
  flashing?: boolean;
}

export type Field = Cell[][];

export interface Pair {
  colors: [PuyoColor, PuyoColor];
  col: number;
  row: number;
  rotation: 0 | 1 | 2 | 3;
}

export type GamePhase =
  | 'idle'
  | 'falling'
  | 'locking'
  | 'flashing'
  | 'dropping'
  | 'gameover';

export interface KeyBindings {
  moveLeft:    string;
  moveRight:   string;
  softDrop:    string;
  hardDrop:    string;
  rotateLeft:  string;
  rotateRight: string;
  pause:       string;
}

export interface GameState {
  field: Field;
  currentPair: Pair | null;
  nextPair: [PuyoColor, PuyoColor];
  score: number;
  highScore: number;
  level: number;
  chain: number;
  phase: GamePhase;
  flashTimer: number;
  dropTimer: number;
  fallInterval: number;
  pendingClearCells: [number, number][];
  paused: boolean;
}

export type GameAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'RESTART' }
  | { type: 'TICK'; delta: number }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'SOFT_DROP' }
  | { type: 'HARD_DROP' }
  | { type: 'ROTATE_LEFT' }
  | { type: 'ROTATE_RIGHT' };

// ── Battle mode ──────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard';
export type BattlePhase = 'selecting' | 'playing' | 'win' | 'lose';

export interface BattleSideState {
  field: Field;
  currentPair: Pair | null;
  nextPair: [PuyoColor, PuyoColor];
  phase: GamePhase;
  flashTimer: number;
  dropTimer: number;
  fallInterval: number;
  pendingClearCells: [number, number][];
  chain: number;
  pendingOjama: number;
  score: number;
}

export interface NpcDecision {
  col: number;
  rotation: 0 | 1 | 2 | 3;
}

export interface BattleState {
  player: BattleSideState;
  npc: BattleSideState;
  battlePhase: BattlePhase;
  difficulty: Difficulty;
  npcDecision: NpcDecision | null;
  npcMoveTimer: number;
  paused: boolean;
}

export type BattleAction =
  | { type: 'START_BATTLE'; difficulty: Difficulty }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'BATTLE_TICK'; delta: number }
  | { type: 'PLAYER_MOVE_LEFT' }
  | { type: 'PLAYER_MOVE_RIGHT' }
  | { type: 'PLAYER_SOFT_DROP' }
  | { type: 'PLAYER_HARD_DROP' }
  | { type: 'PLAYER_ROTATE_LEFT' }
  | { type: 'PLAYER_ROTATE_RIGHT' };
