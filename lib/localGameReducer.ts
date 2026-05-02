import type { Field, GamePhase, Pair, PuyoColor } from './types';
import {
  emptyField, randomPair, spawnPair, isValidPosition, rotatePair,
  placePair, applyGravityStep, findClearablePuyos, clearCells,
  calcScore, calcOjama, dropOjama, isGameOver, setFlashing,
} from './gameLogic';
import { FALL_INTERVAL_BASE, FLASH_DURATION, GRAVITY_STEP_MS } from './constants';

export interface LocalState {
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
  alive: boolean;
}

export type LocalAction =
  | { type: 'RESET' }
  | { type: 'TICK'; delta: number; onOjama: (n: number) => void }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'ROTATE_LEFT' }
  | { type: 'ROTATE_RIGHT' }
  | { type: 'SOFT_DROP'; onOjama: (n: number) => void }
  | { type: 'HARD_DROP'; onOjama: (n: number) => void }
  | { type: 'ADD_OJAMA'; amount: number };

export function initialLocal(): LocalState {
  return {
    field: emptyField(),
    currentPair: null,
    nextPair: randomPair(),
    phase: 'idle',
    flashTimer: 0,
    dropTimer: 0,
    fallInterval: FALL_INTERVAL_BASE,
    pendingClearCells: [],
    chain: 0,
    pendingOjama: 0,
    score: 0,
    alive: true,
  };
}

function doSpawn(s: LocalState): LocalState {
  let field = s.field;
  if (s.pendingOjama > 0) field = dropOjama(field, s.pendingOjama);
  const newPair = spawnPair(s.nextPair);
  if (!isValidPosition(field, newPair)) {
    return { ...s, field, currentPair: null, phase: 'gameover', pendingOjama: 0, alive: false };
  }
  return {
    ...s,
    field,
    currentPair: newPair,
    nextPair: randomPair(),
    phase: 'falling',
    dropTimer: 0,
    chain: 0,
    pendingOjama: 0,
  };
}

function doCheckClears(s: LocalState, onOjama: (n: number) => void): LocalState {
  const toClear = findClearablePuyos(s.field);
  if (toClear.length > 0) {
    const newChain = s.chain + 1;
    const ojama = calcOjama(toClear.length, newChain);
    if (ojama > 0) onOjama(ojama);
    return {
      ...s,
      field: setFlashing(s.field, toClear, true),
      phase: 'flashing',
      flashTimer: FLASH_DURATION,
      pendingClearCells: toClear,
      chain: newChain,
    };
  }
  return doSpawn(s);
}

function doStartDropping(s: LocalState, onOjama: (n: number) => void): LocalState {
  const { field, moved } = applyGravityStep(s.field);
  if (moved) return { ...s, field, phase: 'dropping', dropTimer: 0 };
  return doCheckClears({ ...s, field }, onOjama);
}

function doLockOrFall(s: LocalState, onOjama: (n: number) => void): LocalState {
  if (!s.currentPair) return s;
  const dropped: Pair = { ...s.currentPair, row: s.currentPair.row + 1 };
  if (isValidPosition(s.field, dropped)) {
    return { ...s, currentPair: dropped, dropTimer: 0 };
  }
  const placed = placePair(s.field, s.currentPair);
  if (isGameOver(placed)) {
    return { ...s, field: placed, currentPair: null, phase: 'gameover', alive: false };
  }
  return doStartDropping({ ...s, field: placed, currentPair: null }, onOjama);
}

export function localReducer(s: LocalState, action: LocalAction): LocalState {
  switch (action.type) {
    case 'RESET': return { ...initialLocal(), nextPair: randomPair() };

    case 'ADD_OJAMA':
      return { ...s, pendingOjama: s.pendingOjama + action.amount };

    case 'MOVE_LEFT': {
      if (!s.currentPair || s.phase !== 'falling') return s;
      const moved = { ...s.currentPair, col: s.currentPair.col - 1 };
      return isValidPosition(s.field, moved) ? { ...s, currentPair: moved } : s;
    }
    case 'MOVE_RIGHT': {
      if (!s.currentPair || s.phase !== 'falling') return s;
      const moved = { ...s.currentPair, col: s.currentPair.col + 1 };
      return isValidPosition(s.field, moved) ? { ...s, currentPair: moved } : s;
    }
    case 'ROTATE_LEFT':
      if (!s.currentPair || s.phase !== 'falling') return s;
      return { ...s, currentPair: rotatePair(s.currentPair, -1, s.field) };
    case 'ROTATE_RIGHT':
      if (!s.currentPair || s.phase !== 'falling') return s;
      return { ...s, currentPair: rotatePair(s.currentPair, 1, s.field) };

    case 'SOFT_DROP': {
      if (s.phase !== 'falling') return s;
      return doLockOrFall(s, action.onOjama);
    }
    case 'HARD_DROP': {
      if (!s.currentPair || s.phase !== 'falling') return s;
      let pair = s.currentPair;
      while (isValidPosition(s.field, { ...pair, row: pair.row + 1 })) {
        pair = { ...pair, row: pair.row + 1 };
      }
      return doLockOrFall({ ...s, currentPair: pair }, action.onOjama);
    }

    case 'TICK': {
      const { delta, onOjama } = action;
      if (s.phase === 'idle') return doSpawn(s);

      if (s.phase === 'falling' && s.currentPair) {
        const newTimer = s.dropTimer + delta;
        if (newTimer >= s.fallInterval) return doLockOrFall({ ...s, dropTimer: 0 }, onOjama);
        return { ...s, dropTimer: newTimer };
      }

      if (s.phase === 'dropping') {
        const newTimer = s.dropTimer + delta;
        if (newTimer >= GRAVITY_STEP_MS) {
          const { field, moved } = applyGravityStep(s.field);
          if (moved) return { ...s, field, dropTimer: 0 };
          return doCheckClears({ ...s, field }, onOjama);
        }
        return { ...s, dropTimer: newTimer };
      }

      if (s.phase === 'flashing') {
        const newFlashTimer = s.flashTimer - delta;
        if (newFlashTimer <= 0) {
          const cleared = clearCells(s.field, s.pendingClearCells);
          const score = s.score + calcScore(s.pendingClearCells.length, s.chain);
          return doStartDropping({ ...s, field: cleared, score, pendingClearCells: [] }, onOjama);
        }
        return { ...s, flashTimer: newFlashTimer };
      }

      return s;
    }

    default: return s;
  }
}
