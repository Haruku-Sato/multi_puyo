'use client';
import { useEffect, useRef, useState } from 'react';

interface FloatingItem {
  id: number;
  value: number;
}

interface Props {
  score: number;
}

let nextId = 0;

export default function FloatingScore({ score }: Props) {
  const [items, setItems] = useState<FloatingItem[]>([]);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    const diff = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (diff <= 0) return;

    const item: FloatingItem = { id: nextId++, value: diff };
    setItems(prev => [...prev, item]);
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== item.id));
    }, 900);
  }, [score]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fde047',
            fontWeight: 'bold',
            fontSize: 22,
            textShadow: '0 0 8px #fbbf24, 0 0 3px #000',
            animation: 'float-up 0.9s ease-out forwards',
            whiteSpace: 'nowrap',
          }}
        >
          +{item.value}
        </div>
      ))}
    </div>
  );
}
