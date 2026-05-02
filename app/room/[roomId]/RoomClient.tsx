'use client';
import { useRef, useEffect, useState } from 'react';
import { useMultiGame } from '@/hooks/useMultiGame';
import PuyoField from '@/components/PuyoField';
import ChainPopup from '@/components/ChainPopup';
import ParticleCanvas from '@/components/ParticleCanvas';
import FloatingScore from '@/components/FloatingScore';
import ConfettiCanvas from '@/components/ConfettiCanvas';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Props {
  roomId: string;
  playerName: string;
}

export default function RoomClient({ roomId, playerName }: Props) {
  const { local, remotePlayers, myId, roomPhase, winnerId, isHost, startGame, playSelect } = useMultiGame(roomId, playerName);
  const router = useRouter();

  const otherPlayers = Object.entries(remotePlayers).filter(([id]) => id !== myId);

  // Screen shake when pendingOjama increases
  const prevOjamaRef = useRef(0);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (local.pendingOjama > prevOjamaRef.current) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
    prevOjamaRef.current = local.pendingOjama;
  }, [local.pendingOjama]);

  const isWinner = roomPhase === 'end' && winnerId === myId;
  const isLoser  = roomPhase === 'end' && winnerId !== myId;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 gap-4">
      {/* Confetti for winner */}
      <ConfettiCanvas active={isWinner} />

      {/* Red flash for loser */}
      {isLoser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 40,
            animation: 'red-flash 0.6s ease-out forwards',
          }}
        />
      )}

      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Room: {roomId}</h1>
        <span className="text-gray-400 text-sm">{playerName}</span>
      </div>

      {/* Lobby */}
      {roomPhase === 'lobby' && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="bg-gray-800 rounded-lg p-6 min-w-64">
            <h2 className="text-lg font-semibold mb-3">プレイヤー一覧</h2>
            {Object.entries(remotePlayers).map(([id, p]) => (
              <div key={id} className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                <span>{p.name}</span>
                {id === myId && <span className="text-xs text-gray-400">(あなた)</span>}
                {id === Object.keys(remotePlayers)[0] && <span className="text-xs text-blue-400">[ホスト]</span>}
              </div>
            ))}
            {Object.keys(remotePlayers).length === 0 && (
              <p className="text-gray-500 text-sm">接続中...</p>
            )}
          </div>

          {isHost ? (
            <button
              className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-lg font-bold text-lg transition-colors disabled:opacity-50"
              onClick={startGame}
              disabled={Object.keys(remotePlayers).length < 1}
            >
              ゲーム開始
            </button>
          ) : (
            <p className="text-gray-400">ホストがゲームを開始するのを待っています...</p>
          )}

          <p className="text-gray-500 text-sm">
            ルームコード <span className="font-mono text-white">{roomId}</span> を友達に共有しよう
          </p>
        </div>
      )}

      {/* Playing */}
      {roomPhase === 'playing' && (
        <div className="flex gap-6 flex-wrap justify-center">
          {/* Local player (large) */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-semibold text-blue-300">
              {playerName}{' '}
              <motion.span
                key={local.score}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-yellow-300 inline-block"
              >
                {local.score}pt
              </motion.span>
            </div>
            <div className="flex gap-2">
              <div
                className="relative"
                style={shaking ? { animation: 'puyo-shake 0.5s ease-in-out' } : undefined}
              >
                <PuyoField field={local.field} currentPair={local.currentPair} />
                <ParticleCanvas
                  phase={local.phase}
                  pendingClearCells={local.pendingClearCells}
                  field={local.field}
                  cellPx={36}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <ChainPopup chain={local.chain} />
                </div>
                <FloatingScore score={local.score} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-400">NEXT</div>
                <div className="flex gap-1">
                  {local.nextPair.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        background: c ? `var(--color-${c}, #888)` : 'transparent',
                        backgroundColor: c === 'red' ? '#ff4455' : c === 'blue' ? '#3399ff' : c === 'green' ? '#44dd88' : c === 'yellow' ? '#ffdd22' : '#888',
                      }}
                    />
                  ))}
                </div>
                {local.pendingOjama > 0 && (
                  <div className="text-xs text-red-400 font-bold">
                    おじゃま<br />{local.pendingOjama}個
                  </div>
                )}
                {local.phase === 'gameover' && (
                  <div className="text-red-500 font-bold text-sm mt-2">DEAD</div>
                )}
              </div>
            </div>
          </div>

          {/* Other players (mini) */}
          {otherPlayers.map(([id, p]) => (
            <div key={id} className="flex flex-col items-center gap-2">
              <div className="text-xs font-semibold">
                {p.name}
                <span className="text-yellow-300 ml-1">{p.score}pt</span>
                {!p.alive && <span className="text-red-400 ml-1">DEAD</span>}
              </div>
              <PuyoField field={p.field ?? Array.from({ length: 13 }, () => Array(6).fill({ color: null }))} mini />
            </div>
          ))}
        </div>
      )}

      {/* End screen */}
      {roomPhase === 'end' && (
        <div className="flex flex-col items-center gap-6 mt-8">
          <div className="text-4xl font-bold">
            {winnerId === myId ? '勝利！' : '敗北...'}
          </div>
          {winnerId && remotePlayers[winnerId] && (
            <p className="text-xl">
              {remotePlayers[winnerId].name} の勝ち！
            </p>
          )}
          <div className="flex gap-4">
            {isHost && (
              <button
                className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold transition-colors"
                onClick={() => { playSelect(); startGame(); }}
              >
                もう一度
              </button>
            )}
            <button
              className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded font-bold transition-colors"
              onClick={() => router.push('/')}
            >
              ホームへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
