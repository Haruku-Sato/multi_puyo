'use client';
import { useRef, useEffect } from 'react';
import type { Field } from '@/lib/types';
import { COLORS, COLS, ROWS } from '@/lib/constants';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  radius: number;
  color: string;
}

interface Props {
  phase: string;
  pendingClearCells: [number, number][];
  field: Field;
  cellPx: number;
}

const PARTICLES_PER_CELL = 10;
const DECAY = 0.025;

// PuyoField の border(2px) + gap(1px) に合わせたセル中心座標
function cellCenter(r: number, c: number, cellPx: number): [number, number] {
  return [
    2 + c * (cellPx + 1) + cellPx / 2,
    2 + r * (cellPx + 1) + cellPx / 2,
  ];
}

export default function ParticleCanvas({ phase, pendingClearCells, field, cellPx }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const prevPhaseRef = useRef<string>('');

  // レンダリングのたびに最新の値を ref に保持（stale closure 回避）
  const pendingRef = useRef(pendingClearCells);
  const fieldRef = useRef(field);
  pendingRef.current = pendingClearCells;
  fieldRef.current = field;

  // flashing に入った瞬間だけパーティクルを生成
  useEffect(() => {
    if (phase === 'flashing' && prevPhaseRef.current !== 'flashing') {
      const cells = pendingRef.current;
      const f = fieldRef.current;
      const burst: Particle[] = [];

      for (const [r, c] of cells) {
        const rawColor = f[r][c].color;
        const color = rawColor ? (COLORS[rawColor] ?? '#aaa') : '#aaa';
        const [cx, cy] = cellCenter(r, c, cellPx);

        for (let i = 0; i < PARTICLES_PER_CELL; i++) {
          const angle = (Math.PI * 2 * i) / PARTICLES_PER_CELL + Math.random() * 0.6;
          const speed = 2.5 + Math.random() * 3;
          burst.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            alpha: 1,
            radius: 2.5 + Math.random() * 2.5,
            color,
          });
        }
      }
      particlesRef.current.push(...burst);
    }
    prevPhaseRef.current = phase;
  }, [phase, cellPx]);

  // Canvas アニメーションループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0.02);

      for (const p of particlesRef.current) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.15;   // 重力
        p.vx *= 0.96;   // 摩擦
        p.vy *= 0.96;
        p.alpha -= DECAY;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // PuyoField の実際の描画サイズに合わせる
  const w = 2 + COLS * (cellPx + 1) - 1 + 2;
  const h = 2 + ROWS * (cellPx + 1) - 1 + 2;

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    />
  );
}
