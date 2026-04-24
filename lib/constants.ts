export const COLS = 6;
export const ROWS = 13;
export const CELL_SIZE = 48;
export const CANVAS_WIDTH = COLS * CELL_SIZE;
export const CANVAS_HEIGHT = ROWS * CELL_SIZE;

export const COLORS: Record<string, string> = {
  red:    '#ff4455',
  blue:   '#3399ff',
  green:  '#44dd88',
  yellow: '#ffdd22',
  ojama:  '#999999',
};

export const GLOW_COLORS: Record<string, string> = {
  red:    '#ff2244',
  blue:   '#1177ff',
  green:  '#22cc66',
  yellow: '#ffcc00',
  ojama:  '#555555',
};

export const PUYO_COLORS = ['red', 'blue', 'green', 'yellow'] as const;

export const SPAWN_COL = 2;
export const SPAWN_ROW = 0;

export const FLASH_DURATION  = 600;
export const GRAVITY_STEP_MS = 60;

export const FALL_INTERVAL_BASE = 800;
export const FALL_INTERVAL_MIN  = 100;

export const CHAIN_BONUS = [0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224];
export const SCORE_PER_PUYO = 10;

// ── NPC settings per difficulty ───────────────────────────────────────────────
export const NPC_SETTINGS = {
  easy:   { fallMs: 1600, moveMs: 350 },
  normal: { fallMs:  800, moveMs: 160 },
  hard:   { fallMs:  320, moveMs:  60 },
} as const;

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   '簡単',
  normal: '普通',
  hard:   '難しい',
};

import type { KeyBindings } from './types';
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft:    'ArrowLeft',
  moveRight:   'ArrowRight',
  softDrop:    'ArrowDown',
  hardDrop:    'Space',
  rotateLeft:  'KeyZ',
  rotateRight: 'KeyX',
  pause:       'Escape',
};
