'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSoundEffects } from '@/hooks/useSoundEffects';

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'solo' | 'multi'>('solo');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(randomRoomId());
  const { playSelect } = useSoundEffects();

  const start = () => {
    playSelect();
    const n = name.trim() || 'Player';
    if (mode === 'solo') {
      router.push(`/solo?name=${encodeURIComponent(n)}`);
    } else {
      router.push(`/room/${roomId}?name=${encodeURIComponent(n)}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold tracking-tight">puyo-game</h1>

      <div className="flex flex-col gap-4 w-72">
        {/* Mode selection */}
        <div className="flex gap-4">
          {(['solo', 'multi'] as const).map(m => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-blue-400"
              />
              <span className={mode === m ? 'text-white font-semibold' : 'text-gray-400'}>
                {m === 'solo' ? 'ひとりで' : 'マルチ'}
              </span>
            </label>
          ))}
        </div>

        {/* Player name */}
        <div>
          <label className="text-sm text-gray-400 mb-1 block">プレイヤー名</label>
          <input
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Player"
            maxLength={16}
            onKeyDown={e => e.key === 'Enter' && start()}
          />
        </div>

        {/* Room code (multi only) */}
        {mode === 'multi' && (
          <div>
            <label className="text-sm text-gray-400 mb-1 block">ルームコード</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white uppercase focus:outline-none focus:border-blue-400"
                value={roomId}
                onChange={e => setRoomId(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                maxLength={8}
                onKeyDown={e => e.key === 'Enter' && start()}
              />
              <button
                className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                onClick={() => setRoomId(randomRoomId())}
              >
                新規
              </button>
            </div>
          </div>
        )}

        <button
          className="w-full bg-blue-600 hover:bg-blue-500 rounded py-3 font-bold text-lg transition-colors"
          onClick={start}
        >
          {mode === 'solo' ? 'スタート' : 'ルームに入る'}
        </button>
      </div>

      <div className="text-gray-500 text-sm text-center">
        {mode === 'solo' ? (
          <p>Z:左回転 X:右回転 Space:即落下</p>
        ) : (
          <>
            <p>同じルームコードを共有してマルチ対戦</p>
            <p className="mt-1">最大4人 / Z:左回転 X:右回転 Space:即落下</p>
          </>
        )}
      </div>
    </main>
  );
}
