'use client';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  chain: number;
}

const CHAIN_COLORS = ['', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#60a5fa'];

export default function ChainPopup({ chain }: Props) {
  const color = CHAIN_COLORS[Math.min(chain, CHAIN_COLORS.length - 1)] ?? '#fff';

  return (
    <AnimatePresence mode="wait">
      {chain > 0 && (
        <motion.div
          key={chain}
          initial={{ scale: 0.4, opacity: 0, y: 10 }}
          animate={{ scale: 1.1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ color, textShadow: `0 0 12px ${color}` }}
          className="font-black text-3xl pointer-events-none select-none"
        >
          {chain}連鎖!
        </motion.div>
      )}
    </AnimatePresence>
  );
}
