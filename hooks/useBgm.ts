'use client';
import { useRef, useCallback } from 'react';
import { Howl } from 'howler';

const BGM_SRCS = [
  '/effects/ivan_luzan-mobile-casual-video-game-music-158301.mp3',
  '/effects/lightyeartraxx-kim-lightyear-just-a-dream-wake-up-153991.mp3',
  '/effects/melodyayresgriffiths-machiavellian-nightmare-electronic-dystopia-ai-robot-machine-139385.mp3',
];

export function useBgm() {
  const currentIdxRef = useRef<number>(-1);
  const playCountRef  = useRef<number>(0);
  const activeRef     = useRef<boolean>(false);

  const playNextRef = useRef<(fromIdx: number) => void>(null!);

  const howlsRef = useRef<Howl[]>(
    BGM_SRCS.map((src, i) =>
      new Howl({
        src: [src],
        html5: true,
        volume: 0.5,
        onend: () => playNextRef.current(i),
      })
    )
  );

  playNextRef.current = (fromIdx: number) => {
    // 明示的に停止された後の stale onend は無視
    if (!activeRef.current) return;

    let nextIdx: number;
    if (playCountRef.current < 1) {
      nextIdx = Math.floor(Math.random() * BGM_SRCS.length);
    } else {
      const pool = BGM_SRCS.map((_, i) => i).filter(i => i !== fromIdx);
      nextIdx = pool[Math.floor(Math.random() * pool.length)];
    }
    playCountRef.current += 1;
    currentIdxRef.current = nextIdx;
    howlsRef.current[nextIdx].play();
  };

  const playBgm = useCallback(() => {
    // 全トラックを停止してから開始（古い onend を無効化するため先に activeRef を落とす）
    activeRef.current = false;
    howlsRef.current.forEach(h => h.stop());

    activeRef.current = true;
    playCountRef.current = 0;
    currentIdxRef.current = -1;
    playNextRef.current(-1);
  }, []);

  const stopBgm = useCallback(() => {
    activeRef.current = false;
    howlsRef.current.forEach(h => h.stop());
    currentIdxRef.current = -1;
  }, []);

  return { playBgm, stopBgm };
}
