'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFire } from '@/components/stage/fire';
import {
  BURN_AUDIO_SRC, BURN_AUDIO_VOLUME, BURN_DUCK_LEVEL, BURN_MESSAGE, BURN_TIMING, burnPlan, volumeAt,
} from '@/lib/burn';
import { usePanem } from './PanemProvider';

// Al juntar los tres emblemas todo se prende fuego: llamas sobre toda la pantalla, el mapa y la interfaz se
// chamuscan, suena «The Hanging Tree» y aparece el mensaje. Cada recurso (fuego, canción, clase del body, temporizadores)
// se arma al montarse y se suelta al desmontarse, así cerrar la secuencia en cualquier momento deja todo apagado.
export default function BurnSequence() {
  const { burning } = usePanem();
  return burning ? <Burning /> : null;
}

function Burning() {
  const router = useRouter();
  const { setBurning, reducedMotion, audioState, toggleSound, sfx } = usePanem();
  const [plan] = useState(() => burnPlan({ reducedMotion }));
  const [actionsShown, setActionsShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [song, setSong] = useState('idle'); // 'idle' (todavía no suena) | 'playing' | 'missing' (no hay archivo)
  const audioStateAtStart = useRef(audioState);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const primaryRef = useRef(null);
  const fireRef = useRef(null);
  const songRef = useRef(null);
  const fadeRef = useRef(null);
  const leaveRef = useRef(null);

  const fadeSong = useCallback((to, ms) => {
    const audio = songRef.current;
    if (!audio) return;
    clearInterval(fadeRef.current);
    const from = audio.volume;
    const startedAt = performance.now();
    fadeRef.current = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      audio.volume = Math.min(Math.max(volumeAt(elapsed, ms, from, to), 0), 1);
      if (elapsed >= ms) { clearInterval(fadeRef.current); if (to === 0) audio.pause(); }
    }, 50);
  }, []);

  // La grabación no viene en el repositorio: si falta el archivo, la secuencia sigue en silencio.
  const startSong = useCallback(() => {
    if (songRef.current) return;
    const audio = new Audio(BURN_AUDIO_SRC);
    audio.volume = 0;
    songRef.current = audio;
    // Los avisos de una instancia vieja (p. ej. el montaje doble del modo estricto de React) no deben pisar a la actual.
    const fail = (error) => {
      if (songRef.current !== audio) return;
      songRef.current = null;
      const missing = error === 'load' || error?.name === 'NotSupportedError';
      if (missing) console.warn(`«The Hanging Tree» no suena: falta el archivo. Copiá tu copia en public${BURN_AUDIO_SRC}`);
      setSong(missing ? 'missing' : 'idle'); // 'idle': el navegador bloqueó el autoplay; el botón ♪ lo reintenta con un clic
    };
    audio.addEventListener('error', () => fail('load'), { once: true });
    audio.play().then(() => {
      if (songRef.current !== audio) return;
      setSong('playing');
      fadeSong(BURN_AUDIO_VOLUME, BURN_TIMING.songFadeInMs);
    }).catch(fail);
  }, [fadeSong]);

  useEffect(() => {
    const root = rootRef.current;
    document.body.classList.add('is-burning');
    let fire = null;
    if (plan.animated && canvasRef.current) {
      try { fire = createFire(canvasRef.current, root); fire.setTarget(1); }
      catch (error) { console.warn('El fuego animado no está disponible:', error); }
    }
    if (!fire) root.style.setProperty('--burn', '0.85'); // movimiento reducido o sin canvas: resplandor fijo
    fireRef.current = fire;
    root.focus();
    sfx.play('ignite');
    sfx.duck(true, BURN_DUCK_LEVEL);
    if (audioStateAtStart.current === 'on') startSong();
    const actionsTimer = setTimeout(() => setActionsShown(true), plan.actionsAt);
    return () => {
      clearTimeout(actionsTimer);
      clearTimeout(leaveRef.current);
      clearInterval(fadeRef.current);
      fire?.dispose();
      fireRef.current = null;
      document.body.classList.remove('is-burning');
      sfx.duck(false);
      const audio = songRef.current;
      songRef.current = null;
      if (audio) { audio.pause(); audio.removeAttribute('src'); }
    };
  }, [plan, sfx, startSong]);

  useEffect(() => { if (actionsShown && !leaving) primaryRef.current?.focus(); }, [actionsShown, leaving]);

  const close = useCallback((toCapitol) => {
    if (leaveRef.current) return;
    setLeaving(true);
    fireRef.current?.setTarget(0);
    fadeSong(0, BURN_TIMING.leaveMs);
    leaveRef.current = setTimeout(() => {
      setBurning(false);
      if (toCapitol) router.push('/capitolio');
    }, BURN_TIMING.leaveMs);
  }, [fadeSong, router, setBurning]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  async function listen() {
    if (audioState === 'off' || audioState === 'muted') await toggleSound();
    startSong();
  }

  return (
    <div
      ref={rootRef} className={`burn${leaving ? ' leaving' : ''}`} role="dialog" aria-modal="true"
      aria-labelledby="burn-message" tabIndex={-1}
    >
      <div className="burn-glow" aria-hidden="true" />
      {plan.animated && <canvas ref={canvasRef} className="burn-fire" aria-hidden="true" />}
      {song === 'idle' && (
        <button type="button" className="burn-song" onClick={listen}>♪ Escuchar</button>
      )}
      <div className="burn-content">
        <p className="eyebrow">LOS TRES EMBLEMAS · PANEM ARDE</p>
        <p id="burn-message" className="burn-message" lang="en">
          <span className="sr-only">{BURN_MESSAGE}</span>
          {plan.words.map((word, i) => (
            <span key={`${word}-${i}`} aria-hidden="true" style={{ '--d': `${plan.delays[i]}ms` }}>{word}</span>
          ))}
        </p>
        <p className="burn-sub" style={{ animationDelay: `${plan.subtitleAt}ms` }}>
          Ningún Agente de la Paz puede apagar un fuego que ya prendió en todos los distritos.
        </p>
        <div className="burn-actions" data-show={actionsShown ? 'true' : 'false'} inert={!actionsShown}>
          <button ref={primaryRef} type="button" className="primary" onClick={() => close(true)}>Entrar al Capitolio</button>
          <button type="button" onClick={() => close(false)}>Seguir explorando</button>
        </div>
      </div>
    </div>
  );
}
