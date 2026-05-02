'use client';
import { useRef } from 'react';
import type { Field, Pair } from '@/lib/types';
import { getPairCells } from '@/lib/gameLogic';
import { COLS, ROWS, COLORS, GLOW_COLORS } from '@/lib/constants';

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

  const prevPairKeysRef = useRef<Set<string>>(new Set());
  const currentPairKeys = new Set(pairCells.keys());
  const spawnedKeys = new Set(
    [...currentPairKeys].filter(k => !prevPairKeysRef.current.has(k))
  );
  prevPairKeysRef.current = currentPairKeys;

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
          const key = `${r},${c}`;
          const isSpawned = spawnedKeys.has(key);
          const glowColor = pairColor ? GLOW_COLORS[pairColor] : null;

          return (
            <div
              key={key}
              style={{
                width: cellPx,
                height: cellPx,
                background: bg,
                borderRadius: color ? cellPx * 0.4 : 0,
                boxSizing: 'border-box',
                ...(cell.flashing ? {
                  animation: 'puyo-flash 0.45s ease-in-out infinite',
                } : isSpawned && !mini ? {
                  animation: 'puyo-spawn 0.18s ease-out forwards',
                } : {}),
                ...(pairColor && !mini ? {
                  border: '2px solid rgba(255,255,255,0.75)',
                  boxShadow: `0 0 ${cellPx * 0.5}px ${glowColor}, 0 0 ${cellPx * 0.2}px #fff`,
                } : {
                  border: 'none',
                }),
              }}
            />
          );
        })
      )}
    </div>
  );
}
