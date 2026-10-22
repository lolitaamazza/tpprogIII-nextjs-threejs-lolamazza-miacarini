'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { createFire } from '@/components/stage/fire';
import {
  BURN_AUDIO_SRC, BURN_AUDIO_VOLUME, BURN_DUCK_LEVEL, BURN_MESSAGE, BURN_TIMING, burnPlan, volumeAt,
} from '@/lib/burn';
import { usePanem } from './PanemProvider';

// La chispa abre la historia de la rebelión. Fuego, audio, GSAP y foco se liberan al salir.
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
    const previousFocus = document.activeElement;
    const backgrounds = [...document.querySelectorAll('.overlay, .site-header')].map(el => ({el, inert:el.inert}));
    backgrounds.forEach(({el}) => {el.inert=true;});
    const animation = gsap.context(() => {
      if (!plan.animated) return;
      gsap.fromTo('.burn-message [aria-hidden]', {yPercent:110, rotateX:-45, opacity:0}, {yPercent:0, rotateX:0, opacity:1, duration:1.1, stagger:.22, delay:1.6, ease:'power4.out'});
      gsap.fromTo('.burn-content', {scale:1.05}, {scale:1,duration:9,ease:'power1.out'});
    }, root);
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
      animation.revert();
      backgrounds.forEach(({el,inert}) => {el.inert=inert;});
      if (previousFocus?.isConnected) previousFocus.focus();
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
    const onKey = (event) => {
      if (event.key === 'Escape') close(true);
      if (event.key === 'Tab') {
        const buttons=[...rootRef.current.querySelectorAll('button')].filter(el=>!el.disabled&&!el.closest('[inert]'));
        const first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===rootRef.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
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
      <button type="button" className="burn-skip" onClick={() => close(true)} aria-label="Saltar e ir al Capitolio">saltar</button>
      {plan.animated && <canvas ref={canvasRef} className="burn-fire" aria-hidden="true" />}
      {song === 'idle' && (
        <button type="button" className="burn-song" onClick={listen}>♪ Escuchar</button>
      )}
      <div className="burn-content">
        <p id="burn-message" className="burn-message" lang="en">
          <span className="sr-only">{BURN_MESSAGE}</span>
          {plan.words.map((word, i) => (
            <span key={`${word}-${i}`} aria-hidden="true" style={{ '--d': `${plan.delays[i]}ms` }}>{word}</span>
          ))}
        </p>
        <p className="burn-sub" style={{ animationDelay: `${plan.subtitleAt}ms` }}>
          Tres distritos encendidos. Ahora responden todos.
        </p>
        <div className="burn-actions" data-show={actionsShown ? 'true' : 'false'} inert={!actionsShown}>
          <button ref={primaryRef} type="button" className="primary" onClick={() => close(true)}>Ir al Capitolio →</button>
          <button type="button" onClick={() => close(false)}>Seguir explorando</button>
        </div>
      </div>
    </div>
  );
}
