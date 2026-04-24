'use client';
import { useSearchParams } from 'next/navigation';
import RoomClient from './RoomClient';

export default function RoomLoader({ roomId }: { roomId: string }) {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') ?? 'Player';
  return <RoomClient roomId={roomId} playerName={name} />;
}
