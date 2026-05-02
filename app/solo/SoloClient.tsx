'use client';
import { useSoloGame } from '@/hooks/useSoloGame';
import PuyoField from '@/components/PuyoField';
import ChainPopup from '@/components/ChainPopup';
import ParticleCanvas from '@/components/ParticleCanvas';
import FloatingScore from '@/components/FloatingScore';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Props {
  playerName: string;
}

export default function SoloClient({ playerName }: Props) {
  const { state, restart, playSelect } = useSoloGame();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 gap-4">
      {/* Red flash overlay on gameover */}
      {state.phase === 'gameover' && (
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
        <h1 className="text-2xl font-bold">ひとりで</h1>
        <span className="text-gray-400 text-sm">{playerName}</span>
      </div>

      <div className="flex gap-4 items-start">
        {/* フィールド + オーバーレイ */}
        <div className="relative">
          <PuyoField field={state.field} currentPair={state.currentPair} />
          <ParticleCanvas
            phase={state.phase}
            pendingClearCells={state.pendingClearCells}
            field={state.field}
            cellPx={36}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <ChainPopup chain={state.chain} />
          </div>
          <FloatingScore score={state.score} />
        </div>

        <div className="flex flex-col gap-3 min-w-24">
          <div>
            <div className="text-xs text-gray-400">NEXT</div>
            <div className="flex gap-1 mt-1">
              {state.nextPair.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor:
                      c === 'red' ? '#ff4455' :
                      c === 'blue' ? '#3399ff' :
                      c === 'green' ? '#44dd88' :
                      c === 'yellow' ? '#ffdd22' : '#888',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400">SCORE</div>
            <motion.div
              key={state.score}
              initial={{ scale: 1.4, color: '#fde047' }}
              animate={{ scale: 1,   color: '#fde047' }}
              transition={{ duration: 0.2 }}
              className="font-bold text-lg"
            >
              {state.score}
            </motion.div>
          </div>
        </div>
      </div>

      {state.phase === 'gameover' && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="text-3xl font-bold text-red-400">GAME OVER</div>
          <div className="text-xl text-yellow-300">{state.score} pt</div>
          <div className="flex gap-3">
            <button
              className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold transition-colors"
              onClick={() => { playSelect(); restart(); }}
            >
              もう一度
            </button>
            <button
              className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded font-bold transition-colors"
              onClick={() => { playSelect(); router.push('/'); }}
            >
              ホームへ
            </button>
          </div>
        </div>
      )}

      <div className="text-gray-500 text-xs text-center mt-2">
        ←→: 移動 / Z: 左回転 / X: 右回転 / ↓: ソフトドロップ / Space: 即落下
      </div>
    </div>
  );
}
