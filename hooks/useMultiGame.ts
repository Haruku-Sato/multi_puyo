'use client';
import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import PartySocket from 'partysocket';
import type { Field, GamePhase, Pair, PuyoColor } from '@/lib/types';
import type { RemotePlayer, RoomPlayers, ServerMsg } from '@/lib/multiTypes';
import {
  emptyField, randomPair, spawnPair, isValidPosition, rotatePair,
  placePair, applyGravityStep, findClearablePuyos, clearCells,
  calcScore, calcOjama, dropOjama, isGameOver, setFlashing,
} from '@/lib/gameLogic';
import { FALL_INTERVAL_BASE, FLASH_DURATION, GRAVITY_STEP_MS } from '@/lib/constants';

// ── Local game state ──────────────────────────────────────────────────────────

interface LocalState {
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

type LocalAction =
  | { type: 'RESET' }
  | { type: 'TICK'; delta: number; onOjama: (n: number) => void }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'ROTATE_LEFT' }
  | { type: 'ROTATE_RIGHT' }
  | { type: 'SOFT_DROP'; onOjama: (n: number) => void }
  | { type: 'HARD_DROP'; onOjama: (n: number) => void }
  | { type: 'ADD_OJAMA'; amount: number };

function initialLocal(): LocalState {
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

function localReducer(s: LocalState, action: LocalAction): LocalState {
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
  localRef.current = local;

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
          break;
        case 'GAME_END':
          setWinnerId(msg.winnerId);
          setRoomPhase('end');
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
  };
}
