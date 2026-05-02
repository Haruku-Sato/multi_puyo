'use client';
import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useBgm } from '@/hooks/useBgm';
import PartySocket from 'partysocket';
import type { RemotePlayer, RoomPlayers, ServerMsg } from '@/lib/multiTypes';
import { type LocalState, type LocalAction, initialLocal, localReducer } from '@/lib/localGameReducer';

// ── Hook ──────────────────────────────────────────────────────────────────────

export type RoomPhase = 'lobby' | 'playing' | 'end';

export interface MultiGameHookResult {
  local: LocalState;
  remotePlayers: RoomPlayers;
  myId: string | null;
  roomPhase: RoomPhase;
  winnerId: string | null;
  playerCount: number;
  isHost: boolean;
  startGame: () => void;
  dispatch: (action: Omit<LocalAction, 'onOjama'>) => void;
  playSelect: () => void;
}

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999';

export function useMultiGame(roomId: string, playerName: string): MultiGameHookResult {
  const [local, localDispatch] = useReducer(localReducer, undefined, initialLocal);
  const [remotePlayers, setRemotePlayers] = useState<RoomPlayers>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [roomPhase, setRoomPhase] = useState<RoomPhase>('lobby');
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const socketRef = useRef<PartySocket | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const localRef = useRef(local);
  const stateUpdateTimer = useRef(0);
  const gameOverSent = useRef(false);
  const prevPhaseRef = useRef<string>('idle');
  const myIdRef = useRef<string | null>(null);
  localRef.current = local;

  const { playStart, playFall, playLanding, playDisappear, playLose, playWin, playSelect } = useSoundEffects();
  const { playBgm, stopBgm } = useBgm();

  const sendOjama = useCallback((amount: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'SEND_OJAMA', amount }));
  }, []);

  const dispatchLocal = useCallback((action: Omit<LocalAction, 'onOjama'>) => {
    if ('onOjama' in action) return;
    if (action.type === 'SOFT_DROP' || action.type === 'HARD_DROP') {
      localDispatch({ ...action, onOjama: sendOjama } as LocalAction);
    } else {
      localDispatch(action as LocalAction);
    }
  }, [sendOjama]);

  // WebSocket setup
  useEffect(() => {
    const ws = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    });
    socketRef.current = ws;
    setMyId(ws.id);
    myIdRef.current = ws.id;

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'JOIN', name: playerName }));
    });

    ws.addEventListener('message', (evt: MessageEvent) => {
      const msg = JSON.parse(evt.data as string) as ServerMsg;
      switch (msg.type) {
        case 'ROOM_STATE':
          setRemotePlayers(msg.players);
          if (msg.gameStarted) setRoomPhase('playing');
          break;
        case 'PLAYER_UPDATE':
          setRemotePlayers(prev => ({
            ...prev,
            [msg.id]: { ...prev[msg.id], ...msg.state },
          }));
          break;
        case 'RECEIVE_OJAMA':
          localDispatch({ type: 'ADD_OJAMA', amount: msg.amount });
          break;
        case 'PLAYER_DEAD':
          setRemotePlayers(prev => ({
            ...prev,
            [msg.id]: { ...prev[msg.id], alive: false },
          }));
          break;
        case 'GAME_START':
          gameOverSent.current = false;
          localDispatch({ type: 'RESET' });
          setRoomPhase('playing');
          setWinnerId(null);
          playStart();
          playBgm();
          break;
        case 'GAME_END':
          setWinnerId(msg.winnerId);
          setRoomPhase('end');
          stopBgm();
          if (msg.winnerId === myIdRef.current) playWin();
          else playLose();
          break;
      }
    });

    return () => ws.close();
  }, [roomId, playerName, localDispatch]);

  // Game loop
  const tick = useCallback((time: number) => {
    const delta = lastTimeRef.current ? time - lastTimeRef.current : 0;
    lastTimeRef.current = time;

    const s = localRef.current;
    if (roomPhase !== 'playing') {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (delta > 0 && delta < 200) {
      localDispatch({ type: 'TICK', delta, onOjama: sendOjama });
    }

    // Send game over
    if (s.phase === 'gameover' && !gameOverSent.current) {
      gameOverSent.current = true;
      socketRef.current?.send(JSON.stringify({ type: 'GAME_OVER' }));
    }

    // Throttled state update to server (~5/sec)
    stateUpdateTimer.current += delta;
    if (stateUpdateTimer.current >= 200) {
      stateUpdateTimer.current = 0;
      if (s.phase !== 'idle') {
        socketRef.current?.send(JSON.stringify({
          type: 'STATE_UPDATE',
          state: { field: s.field, score: s.score, alive: s.alive },
        }));
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [roomPhase, sendOjama, localDispatch]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Keyboard
  useEffect(() => {
    if (roomPhase !== 'playing') return;
    const handler = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':  e.preventDefault(); dispatchLocal({ type: 'MOVE_LEFT' }); break;
        case 'ArrowRight': e.preventDefault(); dispatchLocal({ type: 'MOVE_RIGHT' }); break;
        case 'ArrowDown':  e.preventDefault(); dispatchLocal({ type: 'SOFT_DROP' }); break;
        case 'Space':      e.preventDefault(); dispatchLocal({ type: 'HARD_DROP' }); break;
        case 'KeyZ':       e.preventDefault(); dispatchLocal({ type: 'ROTATE_LEFT' }); break;
        case 'KeyX':       e.preventDefault(); dispatchLocal({ type: 'ROTATE_RIGHT' }); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [roomPhase, dispatchLocal]);

  // Phase change sounds
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = local.phase;
    if (prev === curr) return;

    if (curr === 'dropping') {
      if (prev === 'falling') playLanding();
      playFall();
    }
    if (curr === 'flashing') {
      if (prev === 'falling') playLanding();
      playDisappear();
    }

    prevPhaseRef.current = curr;
  }, [local.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const playerIds = Object.keys(remotePlayers);
  const hostId = playerIds[0] ?? null;
  const isHost = myId !== null && myId === hostId;

  const startGame = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'START_GAME' }));
  }, []);

  return {
    local,
    remotePlayers,
    myId,
    roomPhase,
    winnerId,
    playerCount: playerIds.length,
    isHost,
    startGame,
    dispatch: dispatchLocal,
    playSelect,
  };
}
