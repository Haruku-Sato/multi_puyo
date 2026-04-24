import { Suspense } from 'react';
import RoomLoader from './RoomLoader';

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { roomId } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">接続中...</div>}>
      <RoomLoader roomId={roomId} />
    </Suspense>
  );
}
