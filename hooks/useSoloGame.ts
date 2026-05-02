'use client';
import { useReducer, useEffect, useRef, useCallback } from 'react';
import { type LocalState, type LocalAction, initialLocal, localReducer } from '@/lib/localGameReducer';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useBgm } from '@/hooks/useBgm';

export interface SoloGameResult {
  state: LocalState;
  restart: () => void;
  playSelect: () => void;
}

const noop = () => {};

export function useSoloGame(): SoloGameResult {
  const [state, dispatch] = useReducer(localReducer, undefined, initialLocal);
  const stateRef = useRef(state);
  stateRef.current = state;

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const prevPhaseRef = useRef<string>('idle');

  const { playStart, playFall, playLanding, playDisappear, playLose, playSelect } = useSoundEffects();
  const { playBgm, stopBgm } = useBgm();

  // Start sound + BGM on mount, cleanup on unmount
  useEffect(() => {
    playStart();
    playBgm();
    return () => stopBgm();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase change sounds
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    if (prev === curr) return;

    if (curr === 'dropping') {
      if (prev === 'falling') playLanding();
      playFall();
    }
    if (curr === 'flashing') {
      if (prev === 'falling') playLanding();
      playDisappear();
    }
    if (curr === 'gameover') { stopBgm(); playLose(); }

    prevPhaseRef.current = curr;
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Game loop
  const tick = useCallback((time: number) => {
    const delta = lastTimeRef.current ? time - lastTimeRef.current : 0;
    lastTimeRef.current = time;

    if (delta > 0 && delta < 200) {
      dispatch({ type: 'TICK', delta, onOjama: noop });
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (stateRef.current.phase === 'gameover') return;
      switch (e.code) {
        case 'ArrowLeft':  e.preventDefault(); dispatch({ type: 'MOVE_LEFT' }); break;
        case 'ArrowRight': e.preventDefault(); dispatch({ type: 'MOVE_RIGHT' }); break;
        case 'ArrowDown':  e.preventDefault(); dispatch({ type: 'SOFT_DROP', onOjama: noop }); break;
        case 'Space':      e.preventDefault(); dispatch({ type: 'HARD_DROP', onOjama: noop }); break;
        case 'KeyZ':       e.preventDefault(); dispatch({ type: 'ROTATE_LEFT' }); break;
        case 'KeyX':       e.preventDefault(); dispatch({ type: 'ROTATE_RIGHT' }); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const restart = useCallback(() => {
    lastTimeRef.current = 0;
    prevPhaseRef.current = 'idle';
    dispatch({ type: 'RESET' });
    playBgm();
  }, [playBgm]);

  return { state, restart, playSelect };
}
