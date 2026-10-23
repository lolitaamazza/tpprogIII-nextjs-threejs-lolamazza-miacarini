'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePanem } from './PanemProvider';
import { AUDIO_START_GRACE_MS, CLIP, CLIP_LOAD_TIMEOUT_MS, CLIP_REVEAL_WAIT_MS, TIMING, clipDurationMs, introPlan, nextBreakFrame } from '@/lib/introTimeline';
import { createClipPlayer } from '@/lib/youtubeClip';
import { SCREEN_COPY } from '@/lib/broadcastHall';
import './tv-intro.css';

// Intro: en la sala de transmisión del Capitolio la tele central emite el anuncio, la señal se corta (clip del
// video oficial incrustado desde YouTube) y la cámara entra en la pantalla hasta el mapa. Cada fase es un efecto
// con su propia limpieza, así saltar o salir de la página en cualquier momento deja todo apagado.
// La sala es 3D (components/stage/broadcastHall.js); sin WebGL queda la tele dibujada con CSS. Las dos se manejan
// con la misma interfaz de "pantalla" (domScreen / hallScreen), así el guion es uno solo.
const ORDER = ['off', 'boot', 'logo', 'address', 'break', 'clip', 'black', 'enter', 'exit'];
const forward = (next) => (current) => (ORDER.indexOf(next) > ORDER.indexOf(current) ? next : current);

const STATUS = {
  boot: 'Se enciende la tele del Capitolio.',
  logo: 'Transmisión oficial del Capitolio.',
  address: 'El Capitolio anuncia que Panem vive en paz. Toda señal no autorizada será eliminada.',
  break: 'La señal se corta.',
  clip: 'La transmisión está interferida. Se emite un fragmento del video oficial.',
  enter: 'Entrando al mapa de Panem.',
  exit: 'Entrando al mapa de Panem.',
};

const DUCK_LEVEL = 0.08; // la música del mapa baja mientras suena el clip

function makeNoiseTile() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const image = context.createImageData(96, 96);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.random() * 255;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL();
  } catch {
    return null;
  }
}

function resetGlitch(screen) {
  screen.classList.remove('squeeze', 'chroma', 'rolling');
  screen.style.setProperty('--roll', '0%');
  screen.style.setProperty('--skew', '0deg');
  screen.style.setProperty('--n', '0');
}

// Pantalla de la tele CSS (alternativa sin WebGL).
function domScreen(el) {
  const tears = el.querySelectorAll('.tv-tear');
  return {
    view(v) { el.dataset.v = v; },
    power() {},
    smallTvs() {},
    glitch({ kind, squeeze, chroma, rolling, roll, skew, noise }) {
      el.dataset.v = kind;
      el.classList.toggle('squeeze', squeeze);
      el.classList.toggle('chroma', chroma);
      el.classList.toggle('rolling', rolling);
      el.style.setProperty('--roll', `${roll.toFixed(1)}%`);
      el.style.setProperty('--skew', `${skew.toFixed(1)}deg`);
      el.style.setProperty('--n', noise.toFixed(2));
      tears.forEach((tear) => {
        tear.style.top = `${(Math.random() * 100).toFixed(0)}%`;
        tear.style.opacity = Math.random() < 0.6 ? '1' : '0';
      });
    },
    pirate() { el.dataset.v = 'pirate'; el.classList.add('chroma'); el.style.setProperty('--n', '0.28'); },
    clean() { el.style.setProperty('--n', '0'); },
    reset() { resetGlitch(el); },
  };
}

// Pantalla de la sala 3D: la vista se pinta en la tele y el clip va en un iframe ubicado encima.
function hallScreen(hall, overlay) {
  const showClip = (on) => { if (overlay) overlay.dataset.show = on ? 'true' : 'false'; };
  return {
    view(v) { hall.setView(v === 'clip' ? 'none' : v); showClip(v === 'clip'); },
    power(on) { hall.setPower(on); },
    smallTvs(mode) { hall.setSmallTvs(mode); },
    glitch({ kind, squeeze, chroma, rolling, roll, skew, noise }) {
      hall.setView(kind);
      hall.setGlitch({ roll: rolling ? roll / 100 : roll / 400, skew: skew * 0.02, chroma: chroma ? 0.006 : 0, noise, squeeze: squeeze ? 0.34 : 1 });
    },
    pirate() { hall.setView('pirate'); hall.setGlitch({ chroma: 0.004, noise: 0.12 }); showClip(false); },
    clean() { hall.setGlitch({}); },
    reset() { hall.setGlitch({}); },
  };
}

// Corte propio de la señal: salta entre el anuncio, la señal pirata y negro. La regla de destellos vive en
// nextBreakFrame (no más de 3 cuadros claros por segundo) y acá no hay saltos de brillo.
function startGlitch(screen, ms) {
  const startedAt = performance.now();
  let lastBrightAt = -Infinity;
  const frame = () => {
    const now = performance.now();
    const progress = Math.min((now - startedAt) / ms, 1);
    const next = nextBreakFrame({ progress, roll: Math.random(), now, lastBrightAt });
    lastBrightAt = next.lastBrightAt;
    screen.glitch({
      kind: next.kind,
      squeeze: next.kind === 'address' && progress > 0.16 && Math.random() < 0.65,
      chroma: Math.random() < 0.5 + progress * 0.3,
      rolling: progress > 0.08 && progress < 0.9 && Math.random() < 0.7,
      roll: Math.random() * 56 - 28,
      skew: Math.random() * 10 - 5,
      noise: 0.12 + progress * 0.55 + Math.random() * 0.2,
    });
  };
  frame();
  const id = window.setInterval(frame, 90);
  return () => {
    window.clearInterval(id);
    screen.reset();
  };
}

export default function TvIntro() {
  const router = useRouter();
  const { startAudio, sfx, progress, reducedMotion, stageApiRef, webglFailed } = usePanem();
  const litDistricts = progress?.litDistricts ?? [];
  const [phase, setPhase] = useState('off');
  const [plan, setPlan] = useState(null);
  const roomRef = useRef(null);
  const zoomRef = useRef(null);
  const screenRef = useRef(null);
  const clipBoxRef = useRef(null);
  const flashRef = useRef(null);
  const overlayRef = useRef(null);
  // '3d' cuando la escena tiene la sala; 'css' sin WebGL o si la sala no llega a armarse. null mientras se decide.
  const [mode, setMode] = useState(null);
  const powered = useRef(false);
  const ended = useRef(false);
  const soundOn = useRef(false);
  // Reproductor del clip: se arma y arranca (en silencio y oculto) al encender; se muestra en la fase 'clip'.
  const clip = useRef({ promise: null, ctl: null, dead: false, failed: false, cb: {} });

  useEffect(() => {
    const state = clip.current;
    state.dead = false;
    const tile = makeNoiseTile();
    if (tile && roomRef.current) roomRef.current.style.setProperty('--tv-noise', `url(${tile})`);
    return () => {
      state.dead = true;
      state.cb = {};
      state.ctl?.destroy();
      state.ctl = null;
      sfx.duck(false);
    };
  }, [sfx]);

  useEffect(() => {
    if (webglFailed || !stageApiRef.current?.hall) { setMode('css'); return undefined; }
    if (stageApiRef.current.hall.ready()) { setMode('3d'); return undefined; }
    const startedAt = performance.now();
    const id = window.setInterval(() => {
      const hall = stageApiRef.current?.hall;
      if (hall?.ready()) { window.clearInterval(id); setMode('3d'); }
      else if (!hall || performance.now() - startedAt > 4000) { window.clearInterval(id); setMode('css'); }
    }, 100);
    return () => window.clearInterval(id);
  }, [stageApiRef, webglFailed]);

  const getScreen = useCallback(() => {
    if (mode === '3d') { const hall = stageApiRef.current?.hall; return hall ? hallScreen(hall, overlayRef.current) : null; }
    return screenRef.current ? domScreen(screenRef.current) : null;
  }, [mode, stageApiRef]);

  // Ubica el iframe del clip justo encima de la pantalla 3D (la cámara está quieta mientras suena).
  const placeOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const rect = mode === '3d' ? stageApiRef.current?.hall.screenRect() : null;
    if (!overlay || !rect) return;
    Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }, [mode, stageApiRef]);

  const skip = useCallback(() => {
    ended.current = true;
    setPhase((current) => (current === 'enter' ? current : 'exit'));
  }, []);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  function preloadClip() {
    const state = clip.current;
    if (state.promise || !clipBoxRef.current) return;
    state.promise = createClipPlayer(clipBoxRef.current, {
      origin: window.location.origin,
      onEnded: () => state.cb.ended?.(),
      onError: () => { state.failed = true; state.cb.error?.(); },
    }).then((ctl) => {
      if (state.dead) { ctl.destroy(); return null; }
      state.ctl = ctl;
      // Arranca antes del corte y sin sonido (volumen 0, no mute: con la pestaña oculta Chrome pausa los videos con mute),
      // para que la interfaz de YouTube ya esté oculta cuando se muestre.
      ctl.setSound('silent');
      ctl.play();
      return ctl;
    }, () => null);
  }

  async function power() {
    if (powered.current || !mode) return;
    powered.current = true;
    setPhase(forward('boot')); // respuesta inmediata: la línea de encendido arranca ya
    router.prefetch('/mapa');
    // Este clic es el gesto que el navegador exige para habilitar el audio. Si el audio tarda en arrancar la intro
    // sigue sin esperarlo, y el sonido del clip se decide recién cuando se muestra.
    const audio = startAudio().then((state) => { soundOn.current = state === 'on'; });
    await Promise.race([audio, new Promise((resolve) => window.setTimeout(resolve, AUDIO_START_GRACE_MS))]);
    if (clip.current.dead || ended.current) return;
    sfx.play('tvOn');
    const next = introPlan({ reducedMotion });
    if (next.usesClip) { placeOverlay(); preloadClip(); }
    setPlan(next);
  }

  // Las etapas fijas del guion (el clip y la salida dependen de eventos y tienen su propio efecto).
  useEffect(() => {
    if (!plan) return undefined;
    const timers = plan.steps.map((step) => window.setTimeout(() => setPhase(forward(step.phase)), step.at));
    if (plan.exitAt !== null) timers.push(window.setTimeout(() => setPhase(forward('exit')), plan.exitAt));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [plan]);

  // Encendido, logo y anuncio.
  useEffect(() => {
    const screen = getScreen();
    if (!screen) return;
    if (phase === 'boot') { screen.power(true); screen.smallTvs('on'); }
    if (phase === 'logo') { screen.view('logo'); sfx.play('fanfare'); }
    if (phase === 'address') screen.view('address');
  }, [phase, sfx, getScreen]);

  // Corte propio: la señal se rompe y recién después entra el clip.
  useEffect(() => {
    if (phase !== 'break') return undefined;
    const screen = getScreen();
    if (!screen) return undefined;
    sfx.play('cut');
    screen.smallTvs('static');
    const stop = startGlitch(screen, TIMING.breakMs);
    const next = window.setTimeout(() => setPhase(forward('clip')), TIMING.breakMs);
    return () => { window.clearTimeout(next); stop(); };
  }, [phase, sfx, getScreen]);

  // Clip del video oficial. Si no carga o no llega al corte, una señal pirata propia ocupa su lugar.
  useEffect(() => {
    if (phase !== 'clip') return undefined;
    const screen = getScreen();
    const state = clip.current;
    if (!screen) return undefined;
    const timers = [];
    const polls = [];
    const enteredAt = performance.now();
    let cancelled = false;
    let finished = false;
    let ducked = false;
    const later = (fn, ms) => { timers.push(window.setTimeout(fn, ms)); };
    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      setPhase(forward('black'));
    };
    // Mientras el clip llega al corte (o si no llega) se ve la señal pirata propia.
    screen.pirate();
    placeOverlay();
    window.addEventListener('resize', placeOverlay);
    const giveUp = () => {
      state.ctl?.destroy(); // no tiene que seguir sonando ni reproduciéndose detrás
      state.ctl = null;
      later(finish, Math.max(400, TIMING.pirateFallbackMs - (performance.now() - enteredAt)));
    };
    // Espera a que se cumpla la condición, a que el reproductor falle o a que se agote el tiempo.
    const waitFor = (condition, ms) => new Promise((resolve) => {
      if (condition()) { resolve(true); return; }
      const poll = window.setInterval(() => {
        if (condition()) { window.clearInterval(poll); resolve(true); }
        else if (state.failed) { window.clearInterval(poll); resolve(false); }
      }, 50);
      polls.push(poll);
      later(() => { window.clearInterval(poll); resolve(false); }, ms);
    });

    (async () => {
      const loaded = state.promise
        ? await Promise.race([state.promise, new Promise((resolve) => later(() => resolve(null), CLIP_LOAD_TIMEOUT_MS))])
        : null;
      if (cancelled) return;
      if (!loaded || state.failed) { giveUp(); return; }
      // Viene reproduciéndose en silencio desde que se encendió la tele: se muestra al llegar al segundo del corte.
      const atBreak = await waitFor(() => loaded.getTime() >= CLIP.start, CLIP_REVEAL_WAIT_MS);
      if (cancelled) return;
      if (!atBreak) { giveUp(); return; }
      state.cb.ended = finish;
      state.cb.error = finish;
      loaded.setSound(soundOn.current ? 'on' : 'muted');
      screen.clean();
      screen.view('clip');
      if (soundOn.current) { sfx.duck(true, DUCK_LEVEL); ducked = true; }
      // Se corta justo antes del final para no mostrar la pantalla de recomendaciones de YouTube.
      polls.push(window.setInterval(() => { if (loaded.getTime() >= CLIP.end - 0.25) finish(); }, 120));
      later(finish, clipDurationMs() + CLIP_LOAD_TIMEOUT_MS);
    })();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      polls.forEach((id) => window.clearInterval(id));
      state.cb = {};
      window.removeEventListener('resize', placeOverlay);
      screen.reset();
      screen.view('none');
      if (ducked) sfx.duck(false);
      state.ctl?.destroy();
      state.ctl = null;
    };
  }, [phase, sfx, getScreen, placeOverlay]);

  // Negro entre el corte y la entrada al mapa.
  useEffect(() => {
    if (phase !== 'black') return undefined;
    const screen = getScreen();
    screen?.view('none');
    screen?.smallTvs('off');
    const id = window.setTimeout(() => setPhase(forward('enter')), TIMING.blackMs);
    return () => window.clearTimeout(id);
  }, [phase, getScreen]);

  // La pantalla se apaga, la cámara se acerca a la ventana y se pasa al mapa 3D que hay detrás.
  useEffect(() => {
    if (phase !== 'enter') return undefined;
    if (mode === '3d') {
      // La cámara cruza el público y entra en la pantalla, que ya muestra el mapa: al llenar la vista se corta a él.
      let cancelled = false;
      sfx.play('whoosh');
      stageApiRef.current?.hall.enter(TIMING.enterZoomMs / 1000 + 0.9).then(() => { if (!cancelled) router.push('/mapa'); });
      return () => { cancelled = true; };
    }
    const zoom = zoomRef.current;
    const screen = screenRef.current;
    const flash = flashRef.current;
    if (!zoom || !screen || !flash) {
      router.push('/mapa');
      return undefined;
    }
    sfx.play('whoosh');
    // La ventana crece desde su propio centro hasta cubrir todo el visor: se escala y se la lleva al centro de la pantalla.
    const rect = screen.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const scale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.2;
    const shiftX = window.innerWidth / 2 - centerX;
    const shiftY = window.innerHeight / 2 - centerY;
    zoom.style.transformOrigin = `${centerX}px ${centerY}px`;
    flash.style.transition = 'opacity .12s';
    flash.style.opacity = '0.4';
    const timers = [
      window.setTimeout(() => {
        flash.style.transition = 'opacity .5s';
        flash.style.opacity = '0';
        screen.style.transition = 'opacity .5s';
        screen.style.opacity = '0';
      }, 140),
      window.setTimeout(() => {
        zoom.style.transition = `transform ${TIMING.enterZoomMs}ms cubic-bezier(.6, 0, .9, .5)`;
        zoom.style.transform = `translate(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      }, 700),
      window.setTimeout(() => router.push('/mapa'), 700 + TIMING.enterZoomMs + 100),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [phase, router, sfx, mode, stageApiRef]);

  // Salida directa (saltar o movimiento reducido): la sala se desvanece y se pasa al mapa.
  useEffect(() => {
    if (phase !== 'exit') return undefined;
    const id = window.setTimeout(() => router.push('/mapa'), 650);
    return () => window.clearTimeout(id);
  }, [phase, router]);

  const tvCss = mode === 'css' && (
    <div ref={zoomRef} className="tv-zoom">
      <div className="tv-amb" aria-hidden="true" />
      <div className="tv-group">
        <div className="tv-win" aria-hidden="true" />
        <div className="tv-rings" aria-hidden="true" />
        <div className="tv-lamp l" aria-hidden="true" />
        <div className="tv-lamp r" aria-hidden="true" />
        <div className="tv-console">
          <div className="tv-grille" aria-hidden="true" />
          <span className="tv-label" aria-hidden="true">Capitol TV</span>
          {/* La perilla es el mismo comando que el botón de abajo, que es el que leen los lectores de pantalla. */}
          <button type="button" className="tv-knob" onClick={power} tabIndex={-1} aria-hidden="true" />
        </div>
        <div ref={screenRef} className="tv-screen" aria-hidden="true">
          <div className="tv-v tv-logo">
            <span className="tv-seal" />
            <span className="tv-logo-t">{SCREEN_COPY.logo}</span>
          </div>
          <div className="tv-v tv-address" lang="en">
            <div className="tv-content">
              <span className="tv-seal" />
              <p className="tv-eb">{SCREEN_COPY.eyebrow}</p>
              <p className="tv-hd">{SCREEN_COPY.headline}</p>
              <p className="tv-tx">{SCREEN_COPY.body}</p>
            </div>
            <div className="tv-ticker"><span>{SCREEN_COPY.ticker}{SCREEN_COPY.ticker}</span></div>
          </div>
          <div className="tv-v tv-pirate">
            <Image className="tv-map" src="/assets/panem.svg" alt="" width={1000} height={744} loading="eager" />
            <span className="tv-tag">{SCREEN_COPY.pirate}</span>
            <span className="tv-rec" />
          </div>
          <div ref={clipBoxRef} className="tv-v tv-clip" />
          <div className="tv-noise" />
          <div className="tv-sync" />
          <div className="tv-tear" style={{ top: '20%' }} />
          <div className="tv-tear" style={{ top: '55%' }} />
          <div className="tv-tear" style={{ top: '80%' }} />
          <div className="tv-scan" />
          <div className="tv-vig" />
          <div className="tv-glare" />
          <div className="tv-line" />
        </div>
      </div>
    </div>
  );

  return (
    <section ref={roomRef} className={`tv-room${mode === '3d' ? ' is-3d' : ''}`} data-phase={phase} aria-labelledby="tv-title">
      <h1 id="tv-title" className="sr-only">Panem · transmisión oficial del Capitolio</h1>
      {tvCss}
      {mode === '3d' && (
        <div ref={overlayRef} className="tv3d-clip" data-show="false" aria-hidden="true">
          <div ref={clipBoxRef} className="tv3d-clip-box" />
        </div>
      )}
      <div className="tv-foot">
        <button type="button" className="primary tv-power" onClick={power} disabled={phase !== 'off' || !mode}>
          {litDistricts.length ? 'Retomar la señal' : 'Encender la señal'}
        </button>
      </div>
      <button type="button" className="tv-skip" onClick={skip} aria-label="Saltar la intro">saltar</button>
      <div ref={flashRef} className="tv-flash" aria-hidden="true" />
      <p className="sr-only" role="status">{STATUS[phase] ?? ''}</p>
    </section>
  );
}
