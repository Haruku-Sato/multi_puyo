'use client';
import { useRef, useEffect } from 'react';

interface Confetti {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  w: number; h: number;
  angle: number;
  spin: number;
  alpha: number;
}

const COLORS = ['#ff4455', '#3399ff', '#44dd88', '#ffdd22', '#ff99ff', '#ffffff'];

function makeConfetti(w: number): Confetti {
  return {
    x: Math.random() * w,
    y: -10,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    w: 8 + Math.random() * 8,
    h: 4 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.3,
    alpha: 1,
  };
}

interface Props {
  active: boolean;
}

export default function ConfettiCanvas({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<Confetti[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;

    // Spawn confetti in batches
    let spawned = 0;
    const spawnInterval = setInterval(() => {
      for (let i = 0; i < 12; i++) confettiRef.current.push(makeConfetti(W));
      spawned += 12;
      if (spawned >= 120) clearInterval(spawnInterval);
    }, 80);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiRef.current = confettiRef.current.filter(c => c.alpha > 0.02);

      for (const c of confettiRef.current) {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.08;
        c.vx *= 0.99;
        c.angle += c.spin;
        if (c.y > canvas.height * 0.7) c.alpha -= 0.012;

        ctx.save();
        ctx.globalAlpha = Math.max(0, c.alpha);
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      clearInterval(spawnInterval);
      cancelAnimationFrame(rafRef.current);
      confettiRef.current = [];
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={500}
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  );
}
