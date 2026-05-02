'use client';
import { useSearchParams } from 'next/navigation';
import SoloClient from './SoloClient';

export default function SoloLoader() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') ?? 'Player';
  return <SoloClient playerName={name} />;
}
