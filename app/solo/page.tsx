import { Suspense } from 'react';
import SoloLoader from './SoloLoader';

export default function SoloPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">読み込み中...</div>}>
      <SoloLoader />
    </Suspense>
  );
}
