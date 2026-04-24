import { Field, Cell, Pair, PuyoColor } from './types';
import { COLS, ROWS, SPAWN_COL, SPAWN_ROW, PUYO_COLORS, CHAIN_BONUS, SCORE_PER_PUYO } from './constants';

export function emptyField(): Field {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, (): Cell => ({ color: null }))
  );
}

export function randomColor(): PuyoColor {
  return PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)];
}

export function randomPair(): [PuyoColor, PuyoColor] {
  return [randomColor(), randomColor()];
}

export function spawnPair(colors: [PuyoColor, PuyoColor]): Pair {
  // rotation 2 = partner below pivot → both puyos visible at spawn (rows 0 and 1)
  return { colors, col: SPAWN_COL, row: SPAWN_ROW, rotation: 2 };
}

export function getPairCells(pair: Pair): [[number, number], [number, number]] {
  const { col, row, rotation } = pair;
  const offsets: Record<number, [number, number]> = {
    0: [-1, 0],
    1: [0, 1],
    2: [1, 0],
    3: [0, -1],
  };
  const [dr, dc] = offsets[rotation];
  return [[row, col], [row + dr, col + dc]];
}

export function isValidPosition(field: Field, pair: Pair): boolean {
  const cells = getPairCells(pair);
  for (const [r, c] of cells) {
    if (c < 0 || c >= COLS || r >= ROWS) return false;
    if (r >= 0 && field[r][c].color !== null) return false;
  }
  return true;
}

export function rotatePair(pair: Pair, dir: 1 | -1, field: Field): Pair {
  const newRot = ((pair.rotation + dir + 4) % 4) as 0 | 1 | 2 | 3;
  const rotated = { ...pair, rotation: newRot };
  if (isValidPosition(field, rotated)) return rotated;
  const kickLeft = { ...rotated, col: rotated.col - 1 };
  if (isValidPosition(field, kickLeft)) return kickLeft;
  const kickRight = { ...rotated, col: rotated.col + 1 };
  if (isValidPosition(field, kickRight)) return kickRight;
  return pair;
}

export function placePair(field: Field, pair: Pair): Field {
  const newField = field.map(row => row.map(cell => ({ ...cell })));
  const [[r1, c1], [r2, c2]] = getPairCells(pair);
  if (r1 >= 0 && r1 < ROWS) newField[r1][c1] = { color: pair.colors[0] };
  if (r2 >= 0 && r2 < ROWS) newField[r2][c2] = { color: pair.colors[1] };
  return newField;
}

// Move each floating puyo exactly one row down (for animated gravity)
export function applyGravityStep(field: Field): { field: Field; moved: boolean } {
  let moved = false;
  const newField = field.map(row => row.map(cell => ({ ...cell })));
  for (let r = ROWS - 2; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (field[r][c].color !== null && field[r + 1][c].color === null) {
        newField[r + 1][c] = { color: field[r][c].color };
        newField[r][c] = { color: null };
        moved = true;
      }
    }
  }
  return { field: newField, moved };
}

// Instant full-settle (used for NPC planning and ojama drop)
export function applyGravity(field: Field): { field: Field; moved: boolean } {
  let moved = false;
  const newField = field.map(row => row.map(cell => ({ ...cell })));
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newField[r][c].color !== null) {
        if (r !== writeRow) {
          newField[writeRow][c] = { color: newField[r][c].color };
          newField[r][c] = { color: null };
          moved = true;
        }
        writeRow--;
      }
    }
  }
  return { field: newField, moved };
}

function floodFill(field: Field, row: number, col: number, color: PuyoColor, visited: boolean[][]): [number, number][] {
  const group: [number, number][] = [];
  const stack: [number, number][] = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (visited[r][c] || field[r][c].color !== color) continue;
    visited[r][c] = true;
    group.push([r, c]);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return group;
}

export function findClearablePuyos(field: Field): [number, number][] {
  const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const colored: [number, number][] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = field[r][c].color;
      if (!visited[r][c] && color !== null && color !== 'ojama') {
        const group = floodFill(field, r, c, color, visited);
        if (group.length >= 4) colored.push(...group);
      }
    }
  }

  // Ojama adjacent to any cleared colored puyo are also cleared
  const deletedSet = new Set(colored.map(([r, c]) => `${r},${c}`));
  const ojama: [number, number][] = [];
  for (const [r, c] of colored) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS
          && field[nr][nc].color === 'ojama'
          && !deletedSet.has(`${nr},${nc}`)) {
        ojama.push([nr, nc]);
        deletedSet.add(`${nr},${nc}`);
      }
    }
  }

  return [...colored, ...ojama];
}

export function clearCells(field: Field, cells: [number, number][]): Field {
  const newField = field.map(row => row.map(cell => ({ ...cell })));
  for (const [r, c] of cells) newField[r][c] = { color: null };
  return newField;
}

export function calcScore(count: number, chain: number): number {
  const bonus = CHAIN_BONUS[Math.min(chain, CHAIN_BONUS.length - 1)] || 0;
  return count * SCORE_PER_PUYO * (1 + bonus / 10);
}

// Ojama sent to opponent per clear event
export function calcOjama(cleared: number, chain: number): number {
  const chainBonus = Math.max(0, chain - 1) * 3;
  return Math.max(0, cleared - 3) + chainBonus;
}

// Drop ojama at top of field (gravity will settle them)
export function dropOjama(field: Field, count: number): Field {
  const newField = field.map(row => row.map(cell => ({ ...cell })));
  let remaining = count;
  while (remaining > 0) {
    let placedThisPass = 0;
    for (let c = 0; c < COLS && remaining > 0; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (newField[r][c].color === null) {
          newField[r][c] = { color: 'ojama' };
          remaining--;
          placedThisPass++;
          break;
        }
      }
    }
    if (placedThisPass === 0) break;
  }
  // Instantly settle so spawn position is free
  return applyGravity(newField).field;
}

export function isGameOver(field: Field): boolean {
  return field[SPAWN_ROW][SPAWN_COL] !== null && field[SPAWN_ROW][SPAWN_COL].color !== null;
}

export function setFlashing(field: Field, cells: [number, number][], flash: boolean): Field {
  const newField = field.map(row => row.map(cell => ({ ...cell })));
  for (const [r, c] of cells) newField[r][c] = { ...newField[r][c], flashing: flash };
  return newField;
}
