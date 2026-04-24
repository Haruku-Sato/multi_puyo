'use client';
import type { Field, Pair } from '@/lib/types';
import { getPairCells } from '@/lib/gameLogic';
import { COLS, ROWS, COLORS } from '@/lib/constants';

const CELL_PX = 36;

interface Props {
  field: Field;
  currentPair?: Pair | null;
  mini?: boolean;
}

export default function PuyoField({ field, currentPair, mini = false }: Props) {
  const cellPx = mini ? 16 : CELL_PX;

  const pairCells = new Map<string, string>();
  if (currentPair) {
    const [[r1, c1], [r2, c2]] = getPairCells(currentPair);
    if (r1 >= 0) pairCells.set(`${r1},${c1}`, currentPair.colors[0] ?? '');
    if (r2 >= 0) pairCells.set(`${r2},${c2}`, currentPair.colors[1] ?? '');
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${cellPx}px)`,
        border: '2px solid #444',
        background: '#111',
        gap: 1,
      }}
    >
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const cell = field[r][c];
          const pairColor = pairCells.get(`${r},${c}`);
          const color = pairColor ?? cell.color;
          const bg = color ? COLORS[color] : 'transparent';
          return (
            <div
              key={`${r},${c}`}
              style={{
                width: cellPx,
                height: cellPx,
                background: bg,
                opacity: cell.flashing ? 0.3 : 1,
                borderRadius: color ? cellPx * 0.4 : 0,
                transition: 'opacity 0.1s',
                boxSizing: 'border-box',
                border: pairColor ? '2px solid rgba(255,255,255,0.6)' : 'none',
              }}
            />
          );
        })
      )}
    </div>
  );
}
