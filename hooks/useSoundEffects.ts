'use client';
import { useRef } from 'react';
import { Howl } from 'howler';

export function useSoundEffects() {
  const sounds = useRef({
    start:    new Howl({ src: ['/effects/start.wav'],                volume: 1.0, html5: true }),
    fall:     new Howl({ src: ['/effects/puyo_when_fall.wav'],       volume: 1.0, html5: true }),
    landing:  new Howl({ src: ['/effects/puyo_when_landing.wav'],    volume: 1.0, html5: true }),
    disappear:new Howl({ src: ['/effects/puyo_when_disappear.mp3'],  volume: 1.0, html5: true }),
    lose:     new Howl({ src: ['/effects/lose.wav'],                 volume: 1.0, html5: true }),
    win:      new Howl({ src: ['/effects/win.wav'],                  volume: 1.0, html5: true }),
    select:   new Howl({ src: ['/effects/select.wav'],               volume: 1.0, html5: true }),
  });

  return {
    playStart:   () => { console.log('[SFX] start');    sounds.current.start.play(); },
    playFall:    () => { console.log('[SFX] fall');     sounds.current.fall.play(); },
    playLanding: () => { console.log('[SFX] landing');  sounds.current.landing.play(); },
    playDisappear:()=> { console.log('[SFX] disappear');sounds.current.disappear.play(); },
    playLose:    () => { console.log('[SFX] lose');     sounds.current.lose.play(); },
    playWin:     () => { console.log('[SFX] win');      sounds.current.win.play(); },
    playSelect:  () => { console.log('[SFX] select');   sounds.current.select.play(); },
  };
}
